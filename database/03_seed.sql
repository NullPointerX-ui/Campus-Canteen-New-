-- =====================================================================
-- File 3: SAMPLE DATA (INSERT)
-- Users, orders and embeddings are added by scripts/setup.mjs
-- (because passwords must be hashed and embeddings computed by code)
-- =====================================================================

INSERT INTO categories(name) VALUES
 ('Breakfast'), ('Meals'), ('Snacks'), ('Beverages'), ('Desserts'), ('Chinese');

INSERT INTO food_items(category_id, name, description, price, stock_qty, is_veg) VALUES
 ((SELECT category_id FROM categories WHERE name='Breakfast'), 'Masala Dosa',     'Crispy rice crepe stuffed with spiced potato, served with coconut chutney and sambar', 50, 60, TRUE),
 ((SELECT category_id FROM categories WHERE name='Breakfast'), 'Idli Vada',       'Two soft steamed idlis with one crunchy medu vada, light South Indian breakfast', 40, 60, TRUE),
 ((SELECT category_id FROM categories WHERE name='Breakfast'), 'Poha',            'Light flattened rice with peanuts, onion and lemon, mildly spiced', 30, 40, TRUE),
 ((SELECT category_id FROM categories WHERE name='Breakfast'), 'Aloo Paratha',    'Whole wheat flatbread stuffed with spicy mashed potato, served with curd and pickle', 45, 40, TRUE),
 ((SELECT category_id FROM categories WHERE name='Meals'),     'South Indian Thali', 'Full meal with rice, sambar, rasam, two vegetable curries, curd and papad', 90, 50, TRUE),
 ((SELECT category_id FROM categories WHERE name='Meals'),     'Chicken Biryani', 'Fragrant basmati rice cooked with spicy marinated chicken, served with raita', 130, 35, FALSE),
 ((SELECT category_id FROM categories WHERE name='Meals'),     'Veg Pulao',       'Mildly spiced rice with mixed vegetables, light and filling', 70, 40, TRUE),
 ((SELECT category_id FROM categories WHERE name='Meals'),     'Paneer Butter Masala with Roti', 'Soft paneer cubes in rich creamy tomato gravy with two rotis', 110, 30, TRUE),
 ((SELECT category_id FROM categories WHERE name='Meals'),     'Egg Curry Rice',  'Boiled eggs in spicy onion tomato curry with steamed rice, high protein', 85, 30, FALSE),
 ((SELECT category_id FROM categories WHERE name='Snacks'),    'Samosa',          'Deep fried pastry filled with spiced potato and peas, crunchy evening snack', 15, 80, TRUE),
 ((SELECT category_id FROM categories WHERE name='Snacks'),    'Veg Puff',        'Flaky baked pastry with mixed vegetable filling, cheap quick bite', 20, 60, TRUE),
 ((SELECT category_id FROM categories WHERE name='Snacks'),    'Chicken Sandwich','Grilled sandwich with shredded chicken, mayo and lettuce', 60, 30, FALSE),
 ((SELECT category_id FROM categories WHERE name='Snacks'),    'Pav Bhaji',       'Spicy buttery mashed vegetable curry with two toasted buns', 60, 40, TRUE),
 ((SELECT category_id FROM categories WHERE name='Beverages'), 'Filter Coffee',   'Hot strong South Indian filter coffee with milk', 20, 100, TRUE),
 ((SELECT category_id FROM categories WHERE name='Beverages'), 'Masala Chai',     'Hot tea brewed with ginger and cardamom', 15, 100, TRUE),
 ((SELECT category_id FROM categories WHERE name='Beverages'), 'Cold Coffee',     'Chilled blended coffee with milk and ice cream, refreshing on hot days', 50, 40, TRUE),
 ((SELECT category_id FROM categories WHERE name='Beverages'), 'Fresh Lime Soda', 'Cool fizzy lemon drink, sweet or salted, refreshing', 30, 50, TRUE),
 ((SELECT category_id FROM categories WHERE name='Desserts'),  'Gulab Jamun',     'Two soft sweet milk dumplings soaked in sugar syrup', 30, 50, TRUE),
 ((SELECT category_id FROM categories WHERE name='Desserts'),  'Chocolate Brownie','Rich gooey chocolate brownie, sweet treat', 50, 25, TRUE),
 ((SELECT category_id FROM categories WHERE name='Chinese'),   'Veg Hakka Noodles','Stir fried noodles with vegetables and soy sauce, Indo-Chinese style', 70, 40, TRUE),
 ((SELECT category_id FROM categories WHERE name='Chinese'),   'Chicken Fried Rice','Wok tossed rice with chicken, egg and spring onions', 100, 30, FALSE),
 ((SELECT category_id FROM categories WHERE name='Chinese'),   'Gobi Manchurian', 'Crispy cauliflower tossed in spicy tangy Manchurian sauce', 65, 35, TRUE);
