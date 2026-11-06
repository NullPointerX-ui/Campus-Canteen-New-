// =====================================================================
// MongoDB (NoSQL) commands for the Campus Canteen project
// Run in MongoDB Atlas -> "Browse Collections" -> mongosh / Data Explorer,
// or with:  mongosh "<your MONGODB_URI>" mongo/mongo_commands.js
// (scripts/setup.mjs already does all of this automatically)
// =====================================================================

use('canteen');

// ---------- 1. Create collections with schema validation ----------
db.createCollection('feedback', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['orderId', 'itemId', 'userId', 'rating', 'createdAt'],
      properties: {
        orderId:   { bsonType: 'int' },
        itemId:    { bsonType: 'int' },
        userId:    { bsonType: 'int' },
        rating:    { bsonType: 'int', minimum: 1, maximum: 5 },
        comment:   { bsonType: 'string', maxLength: 500 },
        tags:      { bsonType: 'array', items: { bsonType: 'string' } },
        sentiment: { enum: ['positive', 'neutral', 'negative'] },
        createdAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('preferences', {
  validator: { $jsonSchema: { bsonType: 'object', required: ['userId'],
    properties: { userId: { bsonType: 'int' } } } }
});

// ---------- 2. Indexes ----------
db.feedback.createIndex({ orderId: 1, itemId: 1 }, { unique: true }); // one review per item per order
db.feedback.createIndex({ itemId: 1, createdAt: -1 });
db.feedback.createIndex({ comment: 'text' });                          // text index
db.preferences.createIndex({ userId: 1 }, { unique: true });

// ---------- 3. Insert ----------
db.feedback.insertOne({
  orderId: 1, itemId: 1, itemName: 'Masala Dosa', userId: 3, userName: 'Khush',
  rating: 5, comment: 'Crispy and hot, chutney was great', tags: ['tasty', 'fresh'],
  sentiment: 'positive', createdAt: new Date()
});

db.preferences.updateOne(
  { userId: 3 },
  { $set: { diet: 'veg', spice: 'hot', favourites: ['dosa', 'pav bhaji'], notes: 'I like spicy south indian food', updatedAt: new Date() } },
  { upsert: true }
);

// ---------- 4. Find / Update / Delete ----------
db.feedback.find({ rating: { $lte: 2 } }).sort({ createdAt: -1 });
db.feedback.find({ $text: { $search: 'cold' } });
db.feedback.updateOne({ orderId: 1, itemId: 1 }, { $addToSet: { tags: 'value-for-money' } });
db.feedback.deleteMany({ comment: '' });

// ---------- 5. Aggregation pipelines ----------
// Average rating per item
db.feedback.aggregate([
  { $group: { _id: '$itemId', itemName: { $first: '$itemName' },
              avgRating: { $avg: '$rating' }, reviews: { $sum: 1 } } },
  { $sort: { avgRating: -1 } }
]);

// Most common feedback tags
db.feedback.aggregate([
  { $unwind: '$tags' },
  { $group: { _id: '$tags', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 8 }
]);

// Sentiment breakdown
db.feedback.aggregate([{ $group: { _id: '$sentiment', count: { $sum: 1 } } }]);
