const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // will just be "regNo"
  seq: { type: Number, required: true }
});

module.exports = mongoose.model('Counter', counterSchema);