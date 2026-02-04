export const avatarMap: Record<string, any> = {
  cat_gray_01: require("./cat_gray_01.png"),
  cat_black_01: require("./cat_black_01.png"),
  cat_orange_01: require("./cat_orange_01.png"),
  cat_white_01: require("./cat_white_01.png"),
  cat_bengala: require("./cat_bengala.png"),
  cat_mainecoon: require("./cat_mainecoon.png"),
  cat_siames: require("./cat_siames.png"),

  dog_yellow_01: require("./dog_yellow_01.png"),
  dog_black_01: require("./dog_black_01.png"),
  dog_white_01: require("./dog_white_01.png"),
  dog_brown_01: require("./dog_brown_01.png"),
  dog_husky: require("./dog_husky.png"),
  dog_shibainu: require("./dog_shibainu.png"),
};

/** Claves de avatares que requieren Premium */
export const premiumAvatars = new Set([
  "cat_bengala",
  "cat_mainecoon",
  "cat_siames",
  "dog_husky",
  "dog_shibainu",
]);
