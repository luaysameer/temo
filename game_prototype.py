#!/usr/bin/env python3
"""Aoki Densetsu Shoot! -- 1v1 terminal prototype.

A single duel between Toshihiko Tanaka (player) and his rival Kazuhiro Okita
(CPU), built directly from GDD_shoot_roster.json, GDD_shoot_stages.json and
the rules in GDD_shoot_mechanics.md (GUTS economy, 0-30 RNG encounter
formula, special moves and their cinematics).
"""

import json
import os
import random
import sys
import textwrap
import time
from dataclasses import dataclass, field

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

STAT_FLOOR = 1
STAT_CEILING = 255
RNG_MAX = 30
TOTAL_TURNS = 10
HALFTIME_TURN = 5

GUTS_COST = {
    "dribble": 10,   # Normal Dribble (possessor)
    "shoot": 15,     # Normal Shoot (possessor)
    "tackle": 10,    # Normal Tackle (defender, DRIBBLE encounters)
    "block": 12,     # Normal Block (defender, SHOOT encounters)
}

# Phantom Left tiers (SM_001/002/003) and Spiral Drive (SM_R001) carry a GK
# BLOCK penalty and a post-resolution "dodge"/"spin" chance described in the
# GDD effect text but not stored as numeric fields in roster.json.
SHOOT_SPECIAL_MODIFIERS = {
    "SM_001": {"block_penalty": 15, "dodge_chance": 0.20},
    "SM_002": {"block_penalty": 25, "dodge_chance": 0.35},
    "SM_003": {"block_penalty": 40, "dodge_chance": 0.0},
    "SM_R001": {"block_penalty": 25, "dodge_chance": 0.30},
}

CINEMATIC_PAUSE = 0.6


@dataclass
class Fighter:
    name: str
    stats: dict
    guts: int
    guts_max: int
    possession: bool
    special_moves: list = field(default_factory=list)
    limit_break_used: bool = False
    counter_press_used_event: bool = False


def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def find_character(roster, char_id):
    for char in roster:
        if char["id"] == char_id:
            return char
    raise ValueError(f"Character {char_id!r} not found in roster.json")


def build_fighter(char_data, possession):
    stats = dict(char_data["base_stats"])
    return Fighter(
        name=char_data["name"],
        stats=stats,
        guts=stats["GUTS_MAX"],
        guts_max=stats["GUTS_MAX"],
        possession=possession,
        special_moves=char_data.get("special_moves", []),
    )


def clamp(value, low, high):
    return max(low, min(high, value))


def rng_roll():
    return random.randint(0, RNG_MAX)


def apply_exhaustion(fighter, base_stat):
    """GUTS == 0 -> Exhaustion Penalty: stat halved, floored at 1."""
    if fighter.guts == 0:
        return max(STAT_FLOOR, round(base_stat * 0.5))
    return base_stat


def pay_guts(fighter, amount):
    fighter.guts = clamp(fighter.guts - amount, 0, fighter.guts_max)


def resolve_encounter(attacker_total, defender_total):
    """ATTACKER_EFFECTIVE = stat + rng(0,30); re-roll on tie, no ties allowed."""
    attacker_base = clamp(attacker_total, STAT_FLOOR, STAT_CEILING)
    defender_base = clamp(defender_total, STAT_FLOOR, STAT_CEILING)
    while True:
        attacker_effective = attacker_base + rng_roll()
        defender_effective = defender_base + rng_roll()
        if attacker_effective != defender_effective:
            return attacker_effective > defender_effective, attacker_effective, defender_effective


def available_special_moves(fighter, stage):
    """Toshihiko's offensive special moves unlocked for the chosen stage and
    affordable right now. Gotoh Memorial Drive (PASS-type) is excluded -- it
    targets an ally and there is no ally in a 1v1 duel."""
    moves = []
    for move in fighter.special_moves:
        if move["type"] != "SHOOT":
            continue

        unlock_stage = move.get("unlock_stage", 0)
        if unlock_stage > stage:
            continue

        if move["move_id"] == "SM_003":
            if fighter.limit_break_used or fighter.guts < 1:
                continue
        else:
            if fighter.guts < move["guts_cost"]:
                continue

        moves.append(move)
    return moves


def print_cinematic(move, actor_name):
    print()
    print("=" * 60)
    print(f"  *** CINEMATIC: {actor_name} -- {move['name']} ***")
    print("=" * 60)
    for line in textwrap.wrap(move["effect"], 56):
        print(f"  {line}")
    print("=" * 60)
    time.sleep(CINEMATIC_PAUSE)
    print()


def guts_bar(fighter, width=20):
    filled = clamp(round((fighter.guts / fighter.guts_max) * width), 0, width)
    return "[" + "#" * filled + "-" * (width - filled) + "]"


def print_status(toshihiko, okita, score, turn):
    possessor = toshihiko.name if toshihiko.possession else okita.name
    print()
    print(f"----- Turn {turn}/{TOTAL_TURNS} -----")
    print(f"Score: {toshihiko.name} {score[toshihiko.name]} - {score[okita.name]} {okita.name}")
    print(f"Possession: {possessor}")
    print(f"  {toshihiko.name:<18} GUTS {toshihiko.guts:3d}/{toshihiko.guts_max:<3d} {guts_bar(toshihiko)}")
    print(f"  {okita.name:<18} GUTS {okita.guts:3d}/{okita.guts_max:<3d} {guts_bar(okita)}")


def handle_dribble(possessor, defender, move=None):
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

    print(f"\n{possessor.name} tries {move_name}!  "
          f"({possessor.name} DRIBBLE {atk_eff} vs {defender.name} TACKLE {def_eff})")

    if attacker_wins:
        print(f"  -> {possessor.name} breaks past {defender.name} and keeps the ball!")
    else:
        print(f"  -> {defender.name} wins the ball off {possessor.name}!")
        possessor.possession = False
        defender.possession = True


def handle_shoot(possessor, defender, score, move=None):
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

    print(f"\n{possessor.name} unleashes {move_name}!  "
          f"({possessor.name} SHOOT {atk_eff} vs {defender.name} BLOCK {def_eff})")

    goal = attacker_wins
    if not goal and dodge_chance > 0 and random.random() < dodge_chance:
        goal = True
        print(f"  -> {defender.name} gets a hand to it, but the ball curls home anyway "
              f"-- AN IMPOSSIBLE GOAL by {possessor.name}!!")
    elif goal:
        print(f"  -> GOOOAL!! {possessor.name} finds the net!")
    else:
        print(f"  -> {defender.name} keeps it out! No goal.")

    if goal:
        score[possessor.name] += 1

    # Whether scored or saved, the other side restarts with the ball.
    possessor.possession = False
    defender.possession = True


def handle_counter_press(okita, toshihiko, move):
    print_cinematic(move, okita.name)

    attacker_exhausted = apply_exhaustion(okita, okita.stats["TACKLE"])
    defender_exhausted = apply_exhaustion(toshihiko, toshihiko.stats["DRIBBLE"])

    pay_guts(okita, move["guts_cost"])

    attacker_total = attacker_exhausted + move.get("base_tackle_bonus", 0)
    defender_total = defender_exhausted

    attacker_wins, atk_eff, def_eff = resolve_encounter(attacker_total, defender_total)

    print(f"\n{okita.name} presses immediately!  "
          f"({okita.name} TACKLE {atk_eff} vs {toshihiko.name} DRIBBLE {def_eff})")

    if attacker_wins:
        print(f"  -> {okita.name} snaps the ball straight back!")
        okita.possession = True
        toshihiko.possession = False
    else:
        print(f"  -> {toshihiko.name} shields the ball -- Counter Press fails!")


def maybe_counter_press(okita, toshihiko, move):
    if okita.counter_press_used_event:
        return
    okita.counter_press_used_event = True
    if move is None or okita.guts < move["guts_cost"]:
        return
    if random.random() < 0.5:
        handle_counter_press(okita, toshihiko, move)


def cpu_choose_action(okita):
    spiral = next((m for m in okita.special_moves if m["move_id"] == "SM_R001"), None)

    options = [("dribble", None, 0.4)]
    if okita.guts >= GUTS_COST["shoot"]:
        options.append(("shoot", None, 0.3))
    if spiral and okita.guts >= spiral["guts_cost"]:
        options.append(("shoot", spiral, 0.3))

    total = sum(weight for _, _, weight in options)
    roll = random.uniform(0, total)
    running = 0.0
    for action, move, weight in options:
        running += weight
        if roll <= running:
            return action, move
    return options[-1][0], options[-1][1]


def choose_special_move(moves):
    print("\n  -- Special Moves --")
    for idx, move in enumerate(moves, start=1):
        cost = move["guts_cost"]
        cost_label = "ALL remaining GUTS" if isinstance(cost, str) else f"{cost} GUTS"
        print(f"  [{idx}] {move['name']} ({cost_label})")
    back_idx = len(moves) + 1
    print(f"  [{back_idx}] Back")

    while True:
        choice = input("  Choose special move: ").strip()
        if choice.isdigit():
            idx = int(choice)
            if 1 <= idx <= len(moves):
                return moves[idx - 1]
            if idx == back_idx:
                return None
        print("  Invalid choice. Try again.")


def player_menu(toshihiko, stage):
    while True:
        moves = available_special_moves(toshihiko, stage)

        print(f"\n{toshihiko.name}'s turn -- GUTS {toshihiko.guts}/{toshihiko.guts_max}")
        print(f"  [1] Dribble  ({GUTS_COST['dribble']} GUTS)")
        print(f"  [2] Shoot     ({GUTS_COST['shoot']} GUTS)")
        if moves:
            print("  [3] Special Move")

        choice = input("Choose an action: ").strip()
        if choice == "1":
            return "dribble", None
        if choice == "2":
            return "shoot", None
        if choice == "3" and moves:
            move = choose_special_move(moves)
            if move is not None:
                return "shoot", move
            continue

        print("  Invalid choice. Try again.")


def halftime_refill(toshihiko, okita):
    print("\n" + "=" * 60)
    print("  HALFTIME")
    print("=" * 60)
    for fighter in (toshihiko, okita):
        refill = int(fighter.guts_max * 0.4)
        fighter.guts = clamp(fighter.guts + refill, 0, fighter.guts_max)
    print("  Both players catch their breath. GUTS partially restored (+40% of max).")
    print(f"  {toshihiko.name}: {toshihiko.guts}/{toshihiko.guts_max} GUTS")
    print(f"  {okita.name}: {okita.guts}/{okita.guts_max} GUTS")
    print("=" * 60)


def prompt_stage_number():
    raw = input("Select stage number (1-10) to set Phantom Left unlock level [default 9]: ").strip()
    if not raw:
        return 9
    try:
        value = int(raw)
        if 1 <= value <= 10:
            return value
    except ValueError:
        pass
    print("  Invalid input -- defaulting to Stage 9.")
    return 9


def print_intro(stage_num, stages_data, toshihiko, okita):
    print("=" * 60)
    print("  AOKI DENSETSU SHOOT!  --  1v1 PROTOTYPE DUEL")
    print(f"  {toshihiko.name} (Kakegawa High) vs {okita.name} (Tokyo Musashi High)")
    print("=" * 60)

    stage_nine = next((s for s in stages_data if s["stage_number"] == 9), None)
    if stage_nine:
        print(f"\nStage 9 -- {stage_nine['opponent_team']}")
        for line in textwrap.wrap(stage_nine["narrative_context"], 58):
            print(f"  {line}")

    print(f"\nPhantom Left tiers unlocked for Stage {stage_num} and earlier.")
    print(f"Match length: {TOTAL_TURNS} turns, halftime after turn {HALFTIME_TURN}.\n")


def print_summary(toshihiko, okita, score):
    print("\n" + "=" * 60)
    print("  FULL TIME")
    print("=" * 60)
    print(f"  Final Score: {toshihiko.name} {score[toshihiko.name]} - {score[okita.name]} {okita.name}")

    if score[toshihiko.name] > score[okita.name]:
        print(f"\n  {toshihiko.name} wins! Kakegawa roars with the spirit of Coach Gotoh!")
    elif score[toshihiko.name] < score[okita.name]:
        print(f"\n  {okita.name} wins this time. Toshihiko vows revenge in the rematch...")
    else:
        print("\n  A hard-fought draw. The rivalry continues.")
    print("=" * 60)


def main():
    roster = load_json("roster.json")
    stages_data = load_json("stages.json")

    toshihiko = build_fighter(find_character(roster, "CHAR_001"), possession=True)
    okita = build_fighter(find_character(roster, "RIVAL_001"), possession=False)

    counter_press_move = next(
        (m for m in okita.special_moves if m["move_id"] == "SM_R002"), None
    )

    score = {toshihiko.name: 0, okita.name: 0}

    stage_num = prompt_stage_number()
    print_intro(stage_num, stages_data, toshihiko, okita)

    for turn in range(1, TOTAL_TURNS + 1):
        if turn == HALFTIME_TURN + 1:
            halftime_refill(toshihiko, okita)

        print_status(toshihiko, okita, score, turn)

        if toshihiko.possession:
            action, move = player_menu(toshihiko, stage_num)
            if move and move["move_id"] == "SM_003":
                toshihiko.limit_break_used = True
            if move:
                print_cinematic(move, toshihiko.name)

            if action == "dribble":
                handle_dribble(toshihiko, okita, move)
            else:
                handle_shoot(toshihiko, okita, score, move)
        else:
            okita.counter_press_used_event = False

            action, move = cpu_choose_action(okita)
            if move:
                print_cinematic(move, okita.name)

            if action == "dribble":
                handle_dribble(okita, toshihiko, move)
            else:
                handle_shoot(okita, toshihiko, score, move)

            if not okita.possession:
                maybe_counter_press(okita, toshihiko, counter_press_move)

    print_summary(toshihiko, okita, score)


if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print("\n\nMatch abandoned. Goodbye!")
        sys.exit(0)
