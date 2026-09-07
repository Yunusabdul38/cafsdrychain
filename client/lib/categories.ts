/**
 * Produce catalogue driving the two-step picker on the registration wizard:
 * the operator chooses a category, then a product type from that category's
 * own list.
 *
 * This is the single place to edit when the category / product lists grow —
 * nothing else needs to change. Operators can still type a product that is
 * not listed (and pick "Other" as the category), so an incomplete list never
 * blocks a registration.
 */

export type ProductCategory = {
  /** Stored on the batch, so keep names stable once batches exist. */
  name: string;
  products: string[];
};

export const OTHER_CATEGORY = "Other";

/**
 * Offered at the end of every category's product list. Picking it prompts the
 * operator to name the produce, which is stored as `Other (Awara)`.
 */
export const OTHER_PRODUCT = "Other";

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    name: "Grains / Cereals",
    products: ["Maize", "Rice", "Sorghum", "Millet", "Wheat", "Acha / Fonio"],
  },
  {
    name: "Legumes / Pulses",
    products: ["Soybean", "Cowpea", "Groundnut", "Bambara", "Beans"],
  },
  {
    name: "Roots & Tubers",
    products: ["Yam", "Cassava", "Sweet Potato", "Cocoyam", "Irish Potato"],
  },
  {
    name: "Vegetables",
    products: [
      "Tomato",
      "Pepper",
      "Onion",
      "Okra",
      "Spinach",
      "Ugu",
      "Scent Leaf",
      "Bitter Leaf",
    ],
  },
  {
    name: "Fruits",
    products: ["Plantain", "Mango", "Banana", "Pineapple"],
  },
  {
    name: "Herbs / Spices",
    products: ["Ginger", "Turmeric", "Hibiscus / Zobo", "Moringa Leaves"],
  },
  {
    name: "Livestock",
    products: ["Beef", "Goat Meat", "Poultry", "Fish", "Shrimp", "Hide & Skin"],
  },
  {
    name: OTHER_CATEGORY,
    products: [],
  },
];

export const CATEGORY_NAMES = PRODUCT_CATEGORIES.map((c) => c.name);

/**
 * Products for a category, always ending with "Other" so produce missing from
 * the list can still be registered. Empty until a category is chosen.
 */
export function productsForCategory(category: string): string[] {
  const match = PRODUCT_CATEGORIES.find((c) => c.name === category);
  return match ? [...match.products, OTHER_PRODUCT] : [];
}

/** The value stored on the batch: "Mango", or "Other (Awara)" when named. */
export function composeProduct(product: string, otherName: string): string {
  return product === OTHER_PRODUCT ? `${OTHER_PRODUCT} (${otherName.trim()})` : product;
}
