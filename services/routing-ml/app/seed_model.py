"""
Seed a synthetic PPM model from Chennai zone patterns.
Run: python -m app.seed_model

Generates plausible delivery zone sequences based on the 6 Chennai zones
in the SynapseRoute seed database, trains a PPM model, and saves it.
"""

import json
import random
from pathlib import Path
from datetime import datetime, timezone

from app.ml.ppm import build_ppm_model

# Pan-India zones
INDIA_ZONES = [
    "Z-DEL",    # Delhi NCR
    "Z-MUM",    # Mumbai MMR
    "Z-BLR",    # Bangalore
    "Z-HYD",    # Hyderabad
    "Z-MAA",    # Chennai
    "Z-CCU",    # Kolkata
    "Z-PNQ",    # Pune
    "Z-AMD",    # Ahmedabad
]

# Plausible Inter-city or generic zone transition patterns for the ML dictionary
ROUTE_TEMPLATES = [
    ["stz", "Z-AMD", "Z-MUM", "Z-PNQ"],
    ["stz", "Z-DEL", "Z-AMD", "Z-MUM"],
    ["stz", "Z-BLR", "Z-HYD", "Z-MAA"],
    ["stz", "Z-CCU", "Z-HYD", "Z-BLR"],
    ["stz", "Z-MUM", "Z-PNQ", "Z-BLR"],
    ["stz", "Z-DEL", "Z-CCU", "Z-MAA"],
    # Ahmedabad heavy templates
    ["stz", "Z-AMD", "Z-DEL"],
    ["stz", "Z-AMD", "Z-MUM", "Z-BLR"],
    ["stz", "Z-AMD", "Z-PNQ", "Z-HYD", "Z-MAA"],
]


def generate_synthetic_sequences(n_sequences: int = 500) -> list:
    """Generate synthetic zone sequences by sampling and mutating templates."""
    random.seed(42)
    sequences = []

    for _ in range(n_sequences):
        # Pick a template
        template = random.choice(ROUTE_TEMPLATES)
        seq = list(template)

        # Randomly inject extra zones (simulating multi-stop routes)
        if random.random() > 0.3:
            extra_zone = random.choice(INDIA_ZONES)
            insert_pos = random.randint(1, len(seq))
            seq.insert(insert_pos, extra_zone)

        # Occasionally swap two adjacent non-depot zones
        if random.random() > 0.6 and len(seq) > 3:
            i = random.randint(1, len(seq) - 2)
            seq[i], seq[i + 1] = seq[i + 1], seq[i]

        sequences.append(seq)

    return sequences


def main():
    print("Generating synthetic Pan-India zone sequences...")
    sequences = generate_synthetic_sequences(500)
    print(f"  Generated {len(sequences)} sequences")

    print("Training PPM model...")
    model = build_ppm_model(sequences, nb_orders=5, consider_hierarchy=False)
    print(f"  Model trained: order={model.nb_order}, vocab={model.vocab_size}")

    # Save
    model_dir = Path("models")
    model_dir.mkdir(parents=True, exist_ok=True)
    model_file = model_dir / "ppm_model.json"

    model_data = model.to_dict()
    model_data["trained_at"] = datetime.now(timezone.utc).isoformat()
    model_data["source"] = "synthetic-chennai-seed"

    with open(model_file, "w") as f:
        json.dump(model_data, f)

    print(f"  Model saved to {model_file}")
    print("Done!")


if __name__ == "__main__":
    main()
