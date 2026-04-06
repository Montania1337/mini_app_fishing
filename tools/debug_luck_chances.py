import math

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.config import FISHES, FISH_PREFIXES, FISH_SUFFIXES, ROD_PROPERTIES, RodKeyWords


LUCK_TIER = 10
LUCK_BONUS = None


def get_luck_bonus(tier: int | None, explicit_bonus: float | None) -> float:
    if explicit_bonus is not None:
        return float(explicit_bonus)
    if tier is None:
        return 0.0
    return float(ROD_PROPERTIES[RodKeyWords.ROD_LUCK_INCREASE]["tiers"][tier]["value"])


def build_probability_rows(items, luck_bonus: float, label_getter):
    base_weights = [max(float(item.get("rarity_weight", 1)), 0.001) for item in items]
    max_weight = max(base_weights)
    adjusted_weights = []

    for base_weight in base_weights:
        adjusted_weight = base_weight
        if luck_bonus > 0 and max_weight > 0:
            rarity_boost = max(math.sqrt(max_weight / base_weight) - 1.0, 0.0)
            adjusted_weight = max(base_weight * (1 + luck_bonus * rarity_boost), 0.001)
        adjusted_weights.append(adjusted_weight)

    total_adjusted = sum(adjusted_weights)
    rows = []
    for item, base_weight, adjusted_weight in zip(items, base_weights, adjusted_weights):
        rows.append(
            {
                "label": label_getter(item),
                "rarity": item.get("rarity", "-"),
                "base_weight": base_weight,
                "adjusted_weight": adjusted_weight,
                "chance": adjusted_weight / total_adjusted,
            }
        )

    rows.sort(key=lambda row: row["chance"], reverse=True)
    return rows


def print_section(title: str, rows):
    print(f"\n=== {title} ===")
    print(f"{'Name':40} {'Rarity':12} {'BaseW':>10} {'AdjW':>12} {'Chance':>10}")
    print("-" * 90)
    for row in rows:
        print(
            f"{row['label'][:40]:40} "
            f"{row['rarity'][:12]:12} "
            f"{row['base_weight']:10.3f} "
            f"{row['adjusted_weight']:12.3f} "
            f"{row['chance'] * 100:9.3f}%"
        )


def print_fish_rarity_summary(rows):
    by_rarity = {}
    for row in rows:
        by_rarity[row["rarity"]] = by_rarity.get(row["rarity"], 0.0) + row["chance"]

    print("\n=== Fish Rarity Summary ===")
    for rarity, chance in sorted(by_rarity.items()):
        print(f"{rarity:12} {chance * 100:9.3f}%")


def main():
    luck_bonus = get_luck_bonus(LUCK_TIER, LUCK_BONUS)
    print(f"Luck bonus: {luck_bonus}")
    if LUCK_BONUS is not None:
        print("Luck source: explicit bonus from file")
    elif LUCK_TIER is not None:
        print(f"Luck tier: {LUCK_TIER}")
    else:
        print("Luck tier: none")

    fish_rows = build_probability_rows(
        FISHES,
        luck_bonus,
        lambda item: item["name"],
    )
    prefix_rows = build_probability_rows(
        FISH_PREFIXES,
        luck_bonus,
        lambda item: item["name"] or "<empty prefix>",
    )
    suffix_rows = build_probability_rows(
        FISH_SUFFIXES,
        luck_bonus,
        lambda item: item["name"] or "<empty suffix>",
    )

    #print_fish_rarity_summary(fish_rows)
    print_section("Fish Bases", fish_rows)
    print_section("Fish Prefixes", prefix_rows)
    print_section("Fish Suffixes", suffix_rows)


if __name__ == "__main__":
    main()
