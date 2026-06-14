#!/usr/bin/env python3
"""Aoki Densetsu Shoot! -- retro NES-style GUI prototype (pygame).

Reuses the GUTS economy, 0-30 RNG encounter formula and special-move data
from game_prototype.py and presents it through a Captain Tsubasa Vol. II
style menu/dialog-box interface, driven by a pygame state machine (no
blocking input() calls).
"""

import os
import random
import sys
import textwrap

import pygame

from game_prototype import (
    load_json,
    find_character,
    build_fighter,
    clamp,
    apply_exhaustion,
    pay_guts,
    resolve_encounter,
    available_special_moves,
    cpu_choose_action,
    GUTS_COST,
    SHOOT_SPECIAL_MODIFIERS,
    TOTAL_TURNS,
    HALFTIME_TURN,
)

# --------------------------------------------------------------------------- constants

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSET_DIR = os.path.join(BASE_DIR, "assets")

SCREEN_W, SCREEN_H = 1024, 576
FPS = 60

HUD_HEIGHT = 84
DIALOG_RECT = pygame.Rect(16, SCREEN_H - 192, SCREEN_W - 32, 176)

STAGE_NUMBER = 9  # Phantom Left unlock level (matches terminal prototype default)

SPLASH_DURATION = 3.0
SPLASH_FADE_START = 2.0
TYPE_SPEED = 55  # characters per second
WRAP_WIDTH = 84

# GUI-only menu actions not covered by game_prototype's GUTS_COST table
PASS_GUTS_COST = 8
ONE_TWO_INITIATOR_COST = 15
ONE_TWO_RECEIVER_COST = 10
ONE_TWO_SHOOT_BONUS = 10

COLOR_BG_BOX = (8, 8, 92)
COLOR_BORDER = (248, 248, 248)
COLOR_TEXT = (248, 248, 248)
COLOR_HIGHLIGHT = (252, 216, 88)
COLOR_DISABLED = (120, 120, 128)
COLOR_PITCH = (24, 140, 64)
COLOR_LINE = (235, 235, 235)
COLOR_GUTS_FULL = (88, 216, 88)
COLOR_GUTS_LOW = (216, 88, 88)
COLOR_HUD_BG = (4, 4, 30, 200)
COLOR_VPAD = (255, 255, 255, 70)

FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

STATE_SPLASH = "splash"
STATE_MENU_ROOT = "menu_root"
STATE_MENU_SUB_SHOOT = "menu_sub_shoot"
STATE_CINEMATIC = "cinematic"
STATE_GAME_OVER = "game_over"

ROOT_OPTIONS = ["DRIBBLE", "PASS", "SHOOT", "ONE-TWO"]

KEY_ACTION_MAP = {
    pygame.K_UP: "UP",
    pygame.K_DOWN: "DOWN",
    pygame.K_LEFT: "LEFT",
    pygame.K_RIGHT: "RIGHT",
    pygame.K_z: "CONFIRM",
    pygame.K_RETURN: "CONFIRM",
    pygame.K_x: "CANCEL",
    pygame.K_BACKSPACE: "CANCEL",
}

JOY_BUTTON_ACTION_MAP = {0: "CONFIRM", 1: "CANCEL"}


# --------------------------------------------------------------------------- fonts / assets

_font_cache = {}


def get_font(size):
    if size not in _font_cache:
        if os.path.isfile(FONT_PATH):
            _font_cache[size] = pygame.font.Font(FONT_PATH, size)
        else:
            _font_cache[size] = pygame.font.SysFont("monospace", size)
    return _font_cache[size]


def load_image_file(filename):
    path = os.path.join(ASSET_DIR, filename)
    if os.path.isfile(path):
        try:
            return pygame.image.load(path).convert_alpha()
        except pygame.error:
            return None
    return None


def scale_to_fit(image, max_w, max_h):
    width, height = image.get_size()
    scale = min(max_w / width, max_h / height)
    size = (max(1, int(width * scale)), max(1, int(height * scale)))
    return pygame.transform.smoothscale(image, size)


def build_fallback_logo():
    surf = pygame.Surface((640, 480))
    surf.fill((8, 8, 40))
    title = get_font(56).render("TEMO GAME", True, COLOR_HIGHLIGHT)
    subtitle = get_font(40).render("PRESENTS", True, COLOR_TEXT)
    surf.blit(title, title.get_rect(center=(320, 210)))
    surf.blit(subtitle, subtitle.get_rect(center=(320, 280)))
    return surf


def load_assets():
    assets = {}

    logo = load_image_file("temo_logo.png") or build_fallback_logo()
    assets["logo"] = scale_to_fit(logo, 640, 480)

    bg = load_image_file("main_bg.png")
    assets["main_bg"] = pygame.transform.smoothscale(bg, (SCREEN_W, SCREEN_H)) if bg else None

    return assets


# --------------------------------------------------------------------------- pure game logic
# These mirror the resolution functions in game_prototype.py but return lines
# of text for the GUI's typewriter text box instead of printing to stdout.


def gui_resolve_dribble(possessor, defender, move=None):
    attacker_exhausted = apply_exhaustion(possessor, possessor.stats["DRIBBLE"])
    defender_exhausted = apply_exhaustion(defender, defender.stats["TACKLE"])

    if move:
        move_name = move["name"]
        move_bonus = move.get("base_dribble_bonus", 0)
        pay_guts(possessor, move["guts_cost"])
    else:
        move_name = "Dribble"
        move_bonus = 0
        pay_guts(possessor, GUTS_COST["dribble"])

    pay_guts(defender, GUTS_COST["tackle"])

    attacker_total = attacker_exhausted + move_bonus
    defender_total = defender_exhausted

    attacker_wins, atk_eff, def_eff = resolve_encounter(attacker_total, defender_total)

    lines = [
        f"{possessor.name} tries {move_name}!",
        f"{possessor.name} DRIBBLE {atk_eff}  vs  {defender.name} TACKLE {def_eff}",
    ]
    if attacker_wins:
        lines.append(f"{possessor.name} breaks through and keeps the ball!")
    else:
        lines.append(f"{defender.name} wins the ball away from {possessor.name}!")
        possessor.possession = False
        defender.possession = True
    return lines


def gui_resolve_shoot(possessor, defender, score, move=None):
    attacker_exhausted = apply_exhaustion(possessor, possessor.stats["SHOOT"])
    defender_exhausted = apply_exhaustion(defender, defender.stats["BLOCK"])

    block_penalty = 0
    dodge_chance = 0.0

    if move:
        move_name = move["name"]
        guts_cost = move["guts_cost"]
        if isinstance(guts_cost, str):  # Phantom Left -- Limit Break
            guts_cost = max(1, possessor.guts)
        pay_guts(possessor, guts_cost)

        modifiers = SHOOT_SPECIAL_MODIFIERS.get(move["move_id"], {})
        block_penalty = modifiers.get("block_penalty", 0)
        dodge_chance = modifiers.get("dodge_chance", 0.0)

        if "effective_shoot_stat" in move:
            attacker_total = move["effective_shoot_stat"]
        else:
            attacker_total = attacker_exhausted + move.get("base_shoot_bonus", 0)
    else:
        move_name = "Shoot"
        pay_guts(possessor, GUTS_COST["shoot"])
        attacker_total = attacker_exhausted

    pay_guts(defender, GUTS_COST["block"])
    defender_total = defender_exhausted - block_penalty

    attacker_wins, atk_eff, def_eff = resolve_encounter(attacker_total, defender_total)

    lines = [
        f"{possessor.name} unleashes {move_name}!",
        f"{possessor.name} SHOOT {atk_eff}  vs  {defender.name} BLOCK {def_eff}",
    ]

    goal = attacker_wins
    if not goal and dodge_chance > 0 and random.random() < dodge_chance:
        goal = True
        lines.append(f"{defender.name} gets a hand to it, but it curls in anyway --")
        lines.append("AN IMPOSSIBLE GOAL!!")
    elif goal:
        lines.append(f"GOOOAL!! {possessor.name} finds the net!")
    else:
        lines.append(f"{defender.name} keeps it out! No goal.")

    if goal:
        score[possessor.name] += 1

    possessor.possession = False
    defender.possession = True
    return lines


def gui_resolve_pass(possessor, defender):
    pay_guts(possessor, PASS_GUTS_COST)
    lines = [
        f"{possessor.name} looks up for an outlet pass...",
        f"No one is free -- {defender.name} closes the lane down!",
        f"Possession turns over to {defender.name}.",
    ]
    possessor.possession = False
    defender.possession = True
    return lines


def gui_resolve_one_two(possessor, defender, score):
    pay_guts(possessor, ONE_TWO_INITIATOR_COST)
    pay_guts(defender, ONE_TWO_RECEIVER_COST)

    attacker_exhausted = apply_exhaustion(possessor, possessor.stats["SHOOT"])
    defender_exhausted = apply_exhaustion(defender, defender.stats["BLOCK"])

    attacker_total = attacker_exhausted + ONE_TWO_SHOOT_BONUS
    defender_total = defender_exhausted

    attacker_wins, atk_eff, def_eff = resolve_encounter(attacker_total, defender_total)

    lines = [
        f"{possessor.name} plays a quick one-two off {defender.name}'s press!",
        f"{possessor.name} SHOOT {atk_eff}  vs  {defender.name} BLOCK {def_eff}",
    ]
    if attacker_wins:
        lines.append(f"GOOOAL!! The give-and-go pays off for {possessor.name}!")
        score[possessor.name] += 1
    else:
        lines.append(f"{defender.name} reads the move and clears the danger!")

    possessor.possession = False
    defender.possession = True
    return lines


def gui_maybe_counter_press(okita, toshihiko, move):
    if okita.counter_press_used_event or move is None:
        return []
    okita.counter_press_used_event = True
    if okita.guts < move["guts_cost"]:
        return []
    if random.random() >= 0.5:
        return []

    attacker_exhausted = apply_exhaustion(okita, okita.stats["TACKLE"])
    defender_exhausted = apply_exhaustion(toshihiko, toshihiko.stats["DRIBBLE"])

    pay_guts(okita, move["guts_cost"])

    attacker_total = attacker_exhausted + move.get("base_tackle_bonus", 0)
    defender_total = defender_exhausted

    attacker_wins, atk_eff, def_eff = resolve_encounter(attacker_total, defender_total)

    lines = ["", f"-- {move['name']}! --"]
    lines.extend(textwrap.wrap(move["effect"], WRAP_WIDTH))
    lines.append(f"{okita.name} TACKLE {atk_eff}  vs  {toshihiko.name} DRIBBLE {def_eff}")
    if attacker_wins:
        lines.append(f"{okita.name} snaps the ball straight back!")
        okita.possession = True
        toshihiko.possession = False
    else:
        lines.append(f"{toshihiko.name} shields the ball -- Counter Press fails!")
    return lines


def gui_cpu_turn(okita, toshihiko, score, counter_press_move):
    action, move = cpu_choose_action(okita)
    title = move["name"] if move else None
    effect = move["effect"] if move else None

    if action == "dribble":
        lines = gui_resolve_dribble(okita, toshihiko, move)
    else:
        lines = gui_resolve_shoot(okita, toshihiko, score, move)

    if not okita.possession:
        lines.extend(gui_maybe_counter_press(okita, toshihiko, counter_press_move))

    return title, effect, lines


# --------------------------------------------------------------------------- virtual controller


class VirtualController:
    def __init__(self):
        cx, cy = 90, SCREEN_H - 90
        size = 36
        gap = 4
        self.dpad_rects = {
            "UP": pygame.Rect(cx - size // 2, cy - size - gap, size, size),
            "DOWN": pygame.Rect(cx - size // 2, cy + gap, size, size),
            "LEFT": pygame.Rect(cx - size - gap, cy - size // 2, size, size),
            "RIGHT": pygame.Rect(cx + gap, cy - size // 2, size, size),
        }
        self.dpad_center = pygame.Rect(cx - size // 2, cy - size // 2, size, size)
        self.button_a = (SCREEN_W - 70, SCREEN_H - 90, 32)
        self.button_b = (SCREEN_W - 150, SCREEN_H - 60, 32)

    def hit_test(self, pos):
        for action, rect in self.dpad_rects.items():
            if rect.collidepoint(pos):
                return action
        ax, ay, ar = self.button_a
        if (pos[0] - ax) ** 2 + (pos[1] - ay) ** 2 <= ar * ar:
            return "CONFIRM"
        bx, by, br = self.button_b
        if (pos[0] - bx) ** 2 + (pos[1] - by) ** 2 <= br * br:
            return "CANCEL"
        return None

    def draw(self, screen):
        overlay = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
        for rect in self.dpad_rects.values():
            pygame.draw.rect(overlay, COLOR_VPAD, rect, border_radius=4)
        pygame.draw.rect(overlay, COLOR_VPAD, self.dpad_center, border_radius=4)

        ax, ay, ar = self.button_a
        bx, by, br = self.button_b
        pygame.draw.circle(overlay, COLOR_VPAD, (ax, ay), ar)
        pygame.draw.circle(overlay, COLOR_VPAD, (bx, by), br)

        screen.blit(overlay, (0, 0))

        font = get_font(18)
        for label, (x, y, _) in (("A", self.button_a), ("B", self.button_b)):
            text = font.render(label, True, (40, 40, 60))
            screen.blit(text, text.get_rect(center=(x, y)))

        for action, rect in self.dpad_rects.items():
            symbol = {"UP": "^", "DOWN": "v", "LEFT": "<", "RIGHT": ">"}[action]
            text = font.render(symbol, True, (40, 40, 60))
            screen.blit(text, text.get_rect(center=rect.center))


# --------------------------------------------------------------------------- drawing helpers


def draw_text(screen, text, pos, size=20, color=COLOR_TEXT):
    surf = get_font(size).render(text, True, color)
    screen.blit(surf, pos)
    return surf.get_size()


def draw_cursor(screen, x, y, size, color):
    points = [(x, y - size // 2), (x, y + size // 2), (x + size, y)]
    pygame.draw.polygon(screen, color, points)


def draw_guts_bar(screen, x, y, width, height, ratio):
    ratio = clamp(ratio, 0, 1)
    color = COLOR_GUTS_FULL if ratio > 0.25 else COLOR_GUTS_LOW
    pygame.draw.rect(screen, (40, 40, 40), (x, y, width, height))
    pygame.draw.rect(screen, color, (x, y, int(width * ratio), height))
    pygame.draw.rect(screen, COLOR_BORDER, (x, y, width, height), 2)


def draw_background(screen, game):
    bg = game.assets.get("main_bg")
    if bg:
        screen.blit(bg, (0, 0))
    else:
        screen.fill(COLOR_PITCH)
        pygame.draw.line(screen, COLOR_LINE, (0, SCREEN_H // 2), (SCREEN_W, SCREEN_H // 2), 3)
        pygame.draw.circle(screen, COLOR_LINE, (SCREEN_W // 2, SCREEN_H // 2), 70, 3)
        pygame.draw.rect(screen, COLOR_LINE, (0, 40, SCREEN_W, SCREEN_H - 80), 3)


def draw_splash(screen, game):
    screen.fill((0, 0, 0))
    alpha = game.get_splash_alpha()

    logo = game.assets["logo"]
    surf = logo.copy()
    surf.set_alpha(alpha)
    screen.blit(surf, surf.get_rect(center=(SCREEN_W // 2, SCREEN_H // 2)))

    hint = get_font(14).render("Press Z / ENTER to skip", True, (180, 180, 180))
    hint.set_alpha(alpha)
    screen.blit(hint, (SCREEN_W // 2 - hint.get_width() // 2, SCREEN_H - 30))


def draw_hud(screen, game):
    overlay = pygame.Surface((SCREEN_W, HUD_HEIGHT), pygame.SRCALPHA)
    overlay.fill(COLOR_HUD_BG)
    screen.blit(overlay, (0, 0))

    toshihiko, okita = game.toshihiko, game.okita

    turn_text = f"TURN {min(game.turn, TOTAL_TURNS)}/{TOTAL_TURNS}"
    turn_surf = get_font(22).render(turn_text, True, COLOR_HIGHLIGHT)
    screen.blit(turn_surf, ((SCREEN_W - turn_surf.get_width()) // 2, 6))

    score_text = f"{toshihiko.name}  {game.score[toshihiko.name]} - {game.score[okita.name]}  {okita.name}"
    score_surf = get_font(18).render(score_text, True, COLOR_TEXT)
    screen.blit(score_surf, ((SCREEN_W - score_surf.get_width()) // 2, 32))

    possessor = toshihiko.name if toshihiko.possession else okita.name
    poss_surf = get_font(14).render(f"Ball: {possessor}", True, COLOR_HIGHLIGHT)
    screen.blit(poss_surf, ((SCREEN_W - poss_surf.get_width()) // 2, 58))

    draw_text(screen, toshihiko.name, (16, 6), 16)
    draw_guts_bar(screen, 16, 28, 240, 16, toshihiko.guts / toshihiko.guts_max)
    draw_text(screen, f"GUTS {toshihiko.guts}/{toshihiko.guts_max}", (16, 48), 13)

    okita_label = okita.name
    label_surf = get_font(16).render(okita_label, True, COLOR_TEXT)
    screen.blit(label_surf, (SCREEN_W - 16 - label_surf.get_width(), 6))
    draw_guts_bar(screen, SCREEN_W - 16 - 240, 28, 240, 16, okita.guts / okita.guts_max)
    guts_surf = get_font(13).render(f"GUTS {okita.guts}/{okita.guts_max}", True, COLOR_TEXT)
    screen.blit(guts_surf, (SCREEN_W - 16 - guts_surf.get_width(), 48))


def draw_menu(screen, rect, options, cursor, title, enabled=None):
    draw_text(screen, title, (rect.x, rect.y), 18, COLOR_HIGHLIGHT)
    for index, label in enumerate(options):
        y = rect.y + 40 + index * 32
        color = COLOR_TEXT
        if enabled is not None and not enabled[index]:
            color = COLOR_DISABLED
        if index == cursor:
            draw_cursor(screen, rect.x, y + 9, 14, COLOR_HIGHLIGHT)
        draw_text(screen, label, (rect.x + 30, y), 20, color)


def draw_cinematic(screen, rect, game):
    for index, line in enumerate(game.get_visible_lines()):
        draw_text(screen, line, (rect.x, rect.y + index * 22), 16)

    if game.cinematic_done:
        prompt = "Press Z / ENTER to continue"
        surf = get_font(14).render(prompt, True, COLOR_HIGHLIGHT)
        screen.blit(surf, (rect.right - surf.get_width(), rect.bottom - surf.get_height()))


def draw_game_over(screen, rect, game):
    toshihiko, okita = game.toshihiko, game.okita
    draw_text(screen, "FULL TIME", (rect.x, rect.y), 24, COLOR_HIGHLIGHT)
    draw_text(
        screen,
        f"Final Score: {toshihiko.name} {game.score[toshihiko.name]} - "
        f"{game.score[okita.name]} {okita.name}",
        (rect.x, rect.y + 40),
        18,
    )

    if game.score[toshihiko.name] > game.score[okita.name]:
        message = f"{toshihiko.name} wins! Kakegawa roars with the spirit of Coach Gotoh!"
    elif game.score[toshihiko.name] < game.score[okita.name]:
        message = f"{okita.name} wins this time. The rivalry continues..."
    else:
        message = "A hard-fought draw."

    for index, line in enumerate(textwrap.wrap(message, WRAP_WIDTH)):
        draw_text(screen, line, (rect.x, rect.y + 76 + index * 22), 18, COLOR_HIGHLIGHT)

    draw_text(screen, "Press Z / ENTER to play again", (rect.x, rect.bottom - 24), 14)


def draw_dialog_box(screen, game):
    rect = DIALOG_RECT
    pygame.draw.rect(screen, COLOR_BG_BOX, rect)
    pygame.draw.rect(screen, COLOR_BORDER, rect, 4)
    inner = rect.inflate(-32, -24)
    inner.topleft = (rect.x + 16, rect.y + 12)

    if game.state == STATE_MENU_ROOT:
        draw_menu(screen, inner, ROOT_OPTIONS, game.menu_cursor, "Select Action")
    elif game.state == STATE_MENU_SUB_SHOOT:
        options = game.get_shoot_sub_options()
        labels = [label for label, _, _ in options]
        enabled = [en for _, _, en in options]
        draw_menu(screen, inner, labels, game.sub_menu_cursor, "SHOOT", enabled)
    elif game.state == STATE_CINEMATIC:
        draw_cinematic(screen, inner, game)
    elif game.state == STATE_GAME_OVER:
        draw_game_over(screen, inner, game)


# --------------------------------------------------------------------------- game state machine


class Game:
    def __init__(self):
        self.roster = load_json("roster.json")
        self.assets = load_assets()
        self.virtual_controller = VirtualController()

        self.reset_match()
        self.state = STATE_SPLASH
        self.splash_timer = 0.0

    def reset_match(self):
        self.toshihiko = build_fighter(find_character(self.roster, "CHAR_001"), possession=True)
        self.okita = build_fighter(find_character(self.roster, "RIVAL_001"), possession=False)
        self.counter_press_move = next(
            (m for m in self.okita.special_moves if m["move_id"] == "SM_R002"), None
        )

        self.score = {self.toshihiko.name: 0, self.okita.name: 0}
        self.turn = 1
        self.halftime_done = False
        self.menu_cursor = 0
        self.sub_menu_cursor = 0
        self.cinematic_lines = []
        self.reveal_chars = 0.0
        self.cinematic_done = False
        self.on_cinematic_complete = None
        self.start_turn()

    # -- splash --------------------------------------------------------

    def get_splash_alpha(self):
        if self.splash_timer <= SPLASH_FADE_START:
            return 255
        progress = (self.splash_timer - SPLASH_FADE_START) / (SPLASH_DURATION - SPLASH_FADE_START)
        return max(0, int(255 * (1 - progress)))

    def skip_splash(self):
        self.start_turn()

    # -- cinematic text box ---------------------------------------------

    def set_cinematic(self, title, effect, resolution_lines, on_complete):
        lines = []
        if title:
            lines.append(f"*** {title} ***")
        if effect:
            lines.extend(textwrap.wrap(effect, WRAP_WIDTH))
            lines.append("")
        lines.extend(resolution_lines)

        self.cinematic_lines = lines
        self.reveal_chars = 0.0
        self.cinematic_done = False
        self.on_cinematic_complete = on_complete
        self.state = STATE_CINEMATIC

    def get_visible_lines(self):
        remaining = int(self.reveal_chars)
        visible = []
        for line in self.cinematic_lines:
            if remaining <= 0:
                visible.append("")
            elif remaining >= len(line):
                visible.append(line)
                remaining -= len(line)
            else:
                visible.append(line[:remaining])
                remaining = 0
        return visible

    # -- turn flow --------------------------------------------------------

    def start_turn(self):
        if self.toshihiko.possession:
            self.state = STATE_MENU_ROOT
            self.menu_cursor = 0
        else:
            self.run_cpu_turn()

    def run_cpu_turn(self):
        self.okita.counter_press_used_event = False
        title, effect, lines = gui_cpu_turn(
            self.okita, self.toshihiko, self.score, self.counter_press_move
        )
        self.set_cinematic(title, effect, lines, on_complete=self.advance_turn)

    def advance_turn(self):
        self.turn += 1
        if self.turn > TOTAL_TURNS:
            self.state = STATE_GAME_OVER
            return

        if self.turn == HALFTIME_TURN + 1 and not self.halftime_done:
            self.halftime_done = True
            for fighter in (self.toshihiko, self.okita):
                refill = int(fighter.guts_max * 0.4)
                fighter.guts = clamp(fighter.guts + refill, 0, fighter.guts_max)
            lines = [
                "Both players catch their breath.",
                "GUTS partially restored (+40% of max).",
            ]
            self.set_cinematic("HALFTIME", None, lines, on_complete=self.start_turn)
            return

        self.start_turn()

    # -- player actions -----------------------------------------------------

    def do_dribble(self):
        lines = gui_resolve_dribble(self.toshihiko, self.okita)
        self.set_cinematic(None, None, lines, on_complete=self.advance_turn)

    def do_pass(self):
        lines = gui_resolve_pass(self.toshihiko, self.okita)
        self.set_cinematic(None, None, lines, on_complete=self.advance_turn)

    def do_one_two(self):
        lines = gui_resolve_one_two(self.toshihiko, self.okita, self.score)
        self.set_cinematic("ONE-TWO!", None, lines, on_complete=self.advance_turn)

    def do_shoot(self, move=None):
        if move and move["move_id"] == "SM_003":
            self.toshihiko.limit_break_used = True
        lines = gui_resolve_shoot(self.toshihiko, self.okita, self.score, move)
        title = move["name"] if move else None
        effect = move["effect"] if move else None
        self.set_cinematic(title, effect, lines, on_complete=self.advance_turn)

    def get_shoot_sub_options(self):
        options = [("Normal Shoot", None, True)]
        moves = available_special_moves(self.toshihiko, STAGE_NUMBER)
        if moves:
            best = moves[-1]
            options.append((f"Special: {best['name']}", best, True))
        else:
            options.append(("Special: Phantom Left (Locked)", None, False))
        return options

    # -- input dispatch -----------------------------------------------------

    def handle_action(self, action):
        if self.state == STATE_SPLASH:
            if action in ("CONFIRM", "CANCEL"):
                self.skip_splash()
        elif self.state == STATE_MENU_ROOT:
            self.handle_menu_root_input(action)
        elif self.state == STATE_MENU_SUB_SHOOT:
            self.handle_menu_sub_shoot_input(action)
        elif self.state == STATE_CINEMATIC:
            self.handle_cinematic_input(action)
        elif self.state == STATE_GAME_OVER:
            self.handle_game_over_input(action)

    def handle_menu_root_input(self, action):
        if action == "UP":
            self.menu_cursor = (self.menu_cursor - 1) % len(ROOT_OPTIONS)
        elif action == "DOWN":
            self.menu_cursor = (self.menu_cursor + 1) % len(ROOT_OPTIONS)
        elif action == "CONFIRM":
            choice = ROOT_OPTIONS[self.menu_cursor]
            if choice == "DRIBBLE":
                self.do_dribble()
            elif choice == "PASS":
                self.do_pass()
            elif choice == "ONE-TWO":
                self.do_one_two()
            elif choice == "SHOOT":
                self.state = STATE_MENU_SUB_SHOOT
                self.sub_menu_cursor = 0

    def handle_menu_sub_shoot_input(self, action):
        options = self.get_shoot_sub_options()
        if action == "UP":
            self.sub_menu_cursor = (self.sub_menu_cursor - 1) % len(options)
        elif action == "DOWN":
            self.sub_menu_cursor = (self.sub_menu_cursor + 1) % len(options)
        elif action == "CONFIRM":
            _, move, enabled = options[self.sub_menu_cursor]
            if enabled:
                self.do_shoot(move)
        elif action == "CANCEL":
            self.state = STATE_MENU_ROOT
            self.menu_cursor = ROOT_OPTIONS.index("SHOOT")

    def handle_cinematic_input(self, action):
        if action != "CONFIRM":
            return
        if not self.cinematic_done:
            self.reveal_chars = float(sum(len(line) for line in self.cinematic_lines))
            self.cinematic_done = True
            return
        callback = self.on_cinematic_complete
        self.on_cinematic_complete = None
        if callback:
            callback()

    def handle_game_over_input(self, action):
        if action == "CONFIRM":
            self.reset_match()

    # -- update / draw -----------------------------------------------------

    def update(self, dt):
        if self.state == STATE_SPLASH:
            self.splash_timer += dt
            if self.splash_timer >= SPLASH_DURATION:
                self.skip_splash()
        elif self.state == STATE_CINEMATIC:
            if not self.cinematic_done:
                self.reveal_chars += TYPE_SPEED * dt
                total = sum(len(line) for line in self.cinematic_lines)
                if self.reveal_chars >= total:
                    self.reveal_chars = float(total)
                    self.cinematic_done = True

    def draw(self, screen):
        if self.state == STATE_SPLASH:
            draw_splash(screen, self)
            return
        draw_background(screen, self)
        draw_hud(screen, self)
        draw_dialog_box(screen, self)
        self.virtual_controller.draw(screen)


# --------------------------------------------------------------------------- main loop


def main():
    pygame.init()
    pygame.joystick.init()

    screen = pygame.display.set_mode((SCREEN_W, SCREEN_H))
    pygame.display.set_caption("Aoki Densetsu Shoot! -- GUI Prototype")
    clock = pygame.time.Clock()

    game = Game()

    running = True
    while running:
        dt = clock.tick(FPS) / 1000.0

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                else:
                    action = KEY_ACTION_MAP.get(event.key)
                    if action:
                        game.handle_action(action)
            elif event.type == pygame.JOYDEVICEADDED:
                try:
                    pygame.joystick.Joystick(event.device_index)
                except pygame.error:
                    pass
            elif event.type == pygame.JOYHATMOTION:
                hat_x, hat_y = event.value
                if hat_y == 1:
                    game.handle_action("UP")
                elif hat_y == -1:
                    game.handle_action("DOWN")
                if hat_x == -1:
                    game.handle_action("LEFT")
                elif hat_x == 1:
                    game.handle_action("RIGHT")
            elif event.type == pygame.JOYBUTTONDOWN:
                action = JOY_BUTTON_ACTION_MAP.get(event.button)
                if action:
                    game.handle_action(action)
            elif event.type == pygame.MOUSEBUTTONDOWN:
                action = game.virtual_controller.hit_test(event.pos)
                if action:
                    game.handle_action(action)

        game.update(dt)
        game.draw(screen)
        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
