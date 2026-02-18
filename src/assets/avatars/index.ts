export const avatarMap: Record<string, any> = {
  // Gatos
  cat_gray_01: require("./cat_gray_01.png"),
  cat_black_01: require("./cat_black_01.png"),
  cat_orange_01: require("./cat_orange_01.png"),
  cat_white_01: require("./cat_white_01.png"),
  cat_bengala: require("./cat_bengala.png"),
  cat_mainecoon: require("./cat_mainecoon.png"),
  cat_siames: require("./cat_siames.png"),

  // Perros
  dog_yellow_01: require("./dog_yellow_01.png"),
  dog_black_01: require("./dog_black_01.png"),
  dog_white_01: require("./dog_white_01.png"),
  dog_brown_01: require("./dog_brown_01.png"),
  dog_husky: require("./dog_husky.png"),
  dog_shibainu: require("./dog_shibainu.png"),

  // Conejos
  rabbit_white: require("./rabbit_white.png"),
  rabbit_brown: require("./rabbit_brown.png"),
  rabbit_gray: require("./rabbit_gray.png"),
  rabbit_brown_kawaii: require("./rabbit_brown_kawaii.png"),

  // Hamsters
  hamster_golden: require("./hamster_golden.png"),
  hamster_white: require("./hamster_white.png"),
  hamster_gray: require("./hamster_gray.png"),
  hamster_golden_kawaii: require("./hamster_golden_kawaii.png"),

  // Pájaros
  bird_canary: require("./bird_canary.png"),
  bird_parrot: require("./bird_parrot.png"),
  bird_cockatiel: require("./bird_cockatiel.png"),
  bird_canary_kawaii: require("./bird_canary_kawaii.png"),

  // Iguanas
  iguana_green: require("./iguana_green.png"),
  iguana_blue: require("./iguana_blue.png"),
  iguana_green_kawaii: require("./iguana_green_kawaii.png"),

  // Serpientes
  snake_python: require("./snake_python.png"),
  snake_corn: require("./snake_corn.png"),
  snake_corn_kawaii: require("./snake_corn_kawaii.png"),
};

/** Claves de avatares que requieren Premium (razas especiales + kawaii) */
export const premiumAvatars = new Set([
  // Razas especiales de gato
  "cat_bengala",
  "cat_mainecoon",
  "cat_siames",
  // Razas especiales de perro
  "dog_husky",
  "dog_shibainu",
  // Avatares kawaii
  "rabbit_brown_kawaii",
  "hamster_golden_kawaii",
  "bird_canary_kawaii",
  "iguana_green_kawaii",
  "snake_corn_kawaii",
]);

/** Tipos de mascota que son exclusivos Premium (vacío = todos gratis) */
export const premiumPetTypes = new Set<string>([]);
