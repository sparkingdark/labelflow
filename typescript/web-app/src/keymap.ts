export type Keymap = {
  [key: string]: {
    key: string;
    description: string;
    category: string;
  };
};

export const keymap: Keymap = {
  toolSelect: { key: "v", description: "Selection tool", category: "Tools" },
  goToPreviousImage: {
    key: "left",
    description: "Navigate to the previous image",
    category: "Navigation",
  },
  goToNextImage: {
    key: "right",
    description: "Navigate to the next image",
    category: "Navigation",
  },
};