export const capitialize = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : "");

export const getNameStyle = (nameColor) => {
  if (!nameColor) return {};
  if (nameColor.startsWith("linear-gradient") || nameColor.includes("gradient")) {
    return {
      backgroundImage: nameColor,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      display: "inline-block",
      filter: "drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2))",
    };
  }
  if (nameColor.startsWith("#") || nameColor.startsWith("rgb") || nameColor.startsWith("hsl")) {
    return {
      color: nameColor,
      textShadow: "0 0.5px 1px rgba(0, 0, 0, 0.15)",
    };
  }
  return {};
};

export const getNameClass = (nameColor, fallback = "") => {
  if (!nameColor) return fallback;
  if (nameColor.startsWith("text-")) return `${nameColor} font-bold`;
  return "font-bold";
};
