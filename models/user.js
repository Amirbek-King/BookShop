const mongoose = require('mongoose');
const { model } = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    cart: {
        items: [{
            productId: {
                type: Schema.Types.ObjectId,
                required: true
            },

            quantity: {
                type: Number,
                required: true
            }
        }]
    }
});

userSchema.methods.removeFromCart = function (productId) {
    const updatedCart = this.cart.items.filter(item => {
        return item.productId.toString() !== productId.toString();
    });
    this.cart.items = updatedCart;
    return this.save();
};

userSchema.methods.addToCart = function (product) {
    const cartProductIndex = this.cart.items.findIndex(cp => {
        return cp.productId.toString() === product._id.toString();
    });

    let newQuantity = 1;
    const updatedCartItems = [...this.cart.items];

    if (cartProductIndex >= 0) {
        newQuantity = this.cart.items[cartProductIndex].quantity + 1;
        updatedCartItems[cartProductIndex].quantity = newQuantity;
    } else {
        updatedCartItems.push({
            productId: product._id,
            quantity: newQuantity,
            name: product.title
        });
    }

    const updatedCart = {
        items: updatedCartItems
    };

    this.cart = updatedCart;
    console.log(updatedCart);
    return this.save();
};

module.exports = mongoose.model('User', userSchema);
