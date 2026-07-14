/**
 * Bundled word list for Weave (SPEC §6, "bundled permissive list" choice).
 *
 * These are common English nouns/adjectives, hand-curated to satisfy the brief's
 * filters up front: no profanity, no obscure/archaic words, no abbreviations, no
 * proper nouns, and no heavy inflections (we avoid plurals/verb forms). Words are
 * stored UPPERCASE and grouped by length. Individual common dictionary words are
 * not copyrightable, so bundling this offline list carries no attribution issues.
 *
 * To extend: add words to the appropriate length bucket; `WORDS_BY_LENGTH` is the
 * single source the generator draws from.
 */
const RAW: Record<number, string> = {
  3: "CAT DOG SUN OWL FOX ARM EGG INK JAR KEY LOG NUT OAK PEN RAT SEA TEA VAN WEB BOX BUS CAR COW ELK FIR GEM HEN ICE IVY KIT LAP MAP MUD OAR PAW POD RUG SKY TOP URN WAX YAK ZIP BAY BUD CUB DEN FIG",
  4: "LEAF FISH BIRD STAR MOON RAIN SNOW WIND LAKE ROCK SAND WOLF DEER FROG BEAR HAWK LIME PEAR PLUM CORN RICE MILK CAKE SALT ROSE FERN VINE MOSS SEED REED KELP CLAM CRAB SWAN DOVE LARK MOLE HARE LYNX PALM PINE TEAL WAVE DUNE REEF",
  5: "PLANT BRAVE CRANE SHINE GLOVE APPLE GRAPE LEMON MANGO OLIVE PEACH BERRY STONE RIVER OCEAN CLOUD STORM FLAME EMBER FROST BLOOM PETAL TIGER ZEBRA HORSE SHEEP GOOSE ROBIN EAGLE OTTER MOUSE SNAKE MAPLE BIRCH CEDAR ALDER HEATH MARSH CORAL PEARL AMBER TOPAZ ONION BASIL",
  6: "FLOWER GARDEN FOREST MEADOW VALLEY CANYON DESERT ISLAND BREEZE SUNSET ORANGE CHERRY BANANA WALNUT ALMOND PEANUT COPPER SILVER GOLDEN PURPLE YELLOW ORCHID WILLOW POPLAR SPRUCE LOCUST FALCON TURTLE RABBIT BEAVER BADGER SALMON MARBLE PEBBLE MEADOWS",
  7: "RAINBOW SUNRISE THUNDER LANTERN CRYSTAL DIAMOND EMERALD LEOPARD DOLPHIN PENGUIN OCTOPUS COMPASS JOURNEY HARVEST BLOSSOM ORCHARD JUNIPER PRAIRIE PYRAMID GRANITE CARAVAN",
};

function clean(list: string): string[] {
  return list
    .split(/\s+/)
    .map((w) => w.trim().toUpperCase())
    .filter((w) => /^[A-Z]+$/.test(w));
}

export const WORDS_BY_LENGTH: Record<number, string[]> = Object.fromEntries(
  Object.entries(RAW).map(([len, list]) => {
    const words = Array.from(new Set(clean(list))).filter((w) => w.length === Number(len));
    return [Number(len), words];
  }),
);

export const MIN_WORD_LEN = 3;
export const MAX_WORD_LEN = 7;

/** Words of a given length, or [] if none. */
export function wordsOfLength(len: number): string[] {
  return WORDS_BY_LENGTH[len] ?? [];
}

/** Set of all dictionary words (for accidental-word checks). */
export const WORD_SET: ReadonlySet<string> = new Set(
  Object.values(WORDS_BY_LENGTH).flat(),
);
