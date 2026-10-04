/**
 * Default categories seeded on first launch (database/seed.ts).
 * `icon` = lucide-react-native component name. `key` is stable forever (used for seeding/migrations);
 * user renames are stored in `name` and take precedence over the localized defaults.
 */
import type { TransactionType } from '../types/models';

export interface DefaultCategory {
  key: string;
  type: TransactionType;
  name: string; // English default
  nameHi: string; // Hindi default
  icon: string;
  sort: number;
}

export const DEFAULT_INCOME_CATEGORIES: DefaultCategory[] = [
  { key: 'salary', type: 'income', name: 'Salary', nameHi: 'वेतन', icon: 'Wallet', sort: 1 },
  { key: 'business', type: 'income', name: 'Business', nameHi: 'व्यापार', icon: 'Briefcase', sort: 2 },
  { key: 'sales', type: 'income', name: 'Sales', nameHi: 'बिक्री', icon: 'Store', sort: 3 },
  { key: 'freelance', type: 'income', name: 'Freelance', nameHi: 'फ़्रीलांस', icon: 'Laptop', sort: 4 },
  { key: 'commission', type: 'income', name: 'Commission', nameHi: 'कमीशन', icon: 'Percent', sort: 5 },
  { key: 'rent_received', type: 'income', name: 'Rent Received', nameHi: 'किराया मिला', icon: 'House', sort: 6 },
  { key: 'interest', type: 'income', name: 'Interest', nameHi: 'ब्याज', icon: 'Landmark', sort: 7 },
  { key: 'other_income', type: 'income', name: 'Other', nameHi: 'अन्य', icon: 'LayoutGrid', sort: 99 },
];

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategory[] = [
  { key: 'food', type: 'expense', name: 'Food', nameHi: 'खाना', icon: 'Utensils', sort: 1 },
  { key: 'fuel', type: 'expense', name: 'Fuel', nameHi: 'ईंधन', icon: 'Fuel', sort: 2 },
  { key: 'rent', type: 'expense', name: 'Rent', nameHi: 'किराया', icon: 'House', sort: 3 },
  { key: 'electricity', type: 'expense', name: 'Electricity', nameHi: 'बिजली', icon: 'Zap', sort: 4 },
  { key: 'mobile', type: 'expense', name: 'Mobile', nameHi: 'मोबाइल', icon: 'Smartphone', sort: 5 },
  { key: 'internet', type: 'expense', name: 'Internet', nameHi: 'इंटरनेट', icon: 'Wifi', sort: 6 },
  { key: 'transport', type: 'expense', name: 'Transport', nameHi: 'यात्रा', icon: 'Car', sort: 7 },
  { key: 'shopping', type: 'expense', name: 'Shopping', nameHi: 'खरीदारी', icon: 'ShoppingCart', sort: 8 },
  { key: 'medical', type: 'expense', name: 'Medical', nameHi: 'दवा-इलाज', icon: 'BriefcaseMedical', sort: 9 },
  { key: 'education', type: 'expense', name: 'Education', nameHi: 'पढ़ाई', icon: 'GraduationCap', sort: 10 },
  { key: 'emi', type: 'expense', name: 'EMI', nameHi: 'किस्त (EMI)', icon: 'Receipt', sort: 11 },
  { key: 'business_expense', type: 'expense', name: 'Business', nameHi: 'व्यापार', icon: 'Briefcase', sort: 12 },
  { key: 'maintenance', type: 'expense', name: 'Maintenance', nameHi: 'मरम्मत', icon: 'Wrench', sort: 13 },
  { key: 'other_expense', type: 'expense', name: 'Other', nameHi: 'अन्य', icon: 'LayoutGrid', sort: 99 },
];

export const DEFAULT_CATEGORIES = [...DEFAULT_INCOME_CATEGORIES, ...DEFAULT_EXPENSE_CATEGORIES];

/** Keys that can never be deleted (deleted categories' transactions move here). */
export const OTHER_CATEGORY_KEY: Record<TransactionType, string> = {
  income: 'other_income',
  expense: 'other_expense',
};

/** Icons offered in the category editor (lucide-react-native names). */
export const ICON_CHOICES = [
  'Wallet', 'Briefcase', 'Store', 'Laptop', 'Percent', 'House', 'Landmark', 'Utensils', 'Coffee', 'Fuel',
  'Zap', 'Smartphone', 'Wifi', 'Car', 'Bus', 'Bike', 'Truck', 'ShoppingCart', 'ShoppingBag', 'BriefcaseMedical',
  'GraduationCap', 'Receipt', 'Wrench', 'Hammer', 'Shirt', 'Gift', 'Baby', 'PawPrint', 'Tv', 'Gamepad2',
  'Plane', 'Train', 'Droplets', 'Flame', 'Scissors', 'Package', 'Sprout', 'Apple', 'Tag', 'LayoutGrid',
] as const;
