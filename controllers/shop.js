const Product = require('../models/product');
const Order = require('../models/order');
const User = require('../models/user');

exports.getIndex = (req,res,next)=>{
    Product.find()
        .then(products => {
        res.render('shop/index', {
            prods: products,
            path: '/',
            pageTitle: "Main Page",
        });
    }).catch(err =>{
        console.log(err)
    })
};

exports.shopProduct = (req,res,next)=>{
    Product.find().then(products => {
        res.render('shop/index', {
            prods: products,
            path: '/',
            pageTitle: "Main Page",
        });
    }).catch(err =>{
        console.log(err)
    })
}

exports.getCart = (req, res, next) => {
    // exports.getCart = (req, res, next) => {
        // Fetch the user from the database using req.user._id
        User.findById(req.user._id)
            .populate('cart.items.productId')  // Populating the product details
            .then(user => {
                const cartProducts = user.cart.items.map(item => {
                    return {
                        product: item.productId,
                        quantity: item.quantity
                    };
                });
                res.render('shop/cart', {
                    path: '/cart',
                    pageTitle: 'Your Cart',
                    cart: cartProducts
                });
            })
            .catch(err => {
                console.log(err);
            });


};


exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId)
        .then(product => {
            if (!product) {
                return res.status(404).send('Product not found');
            }
            return req.user.addToCart(product);
        })
        .then(result => {
            console.log(result);
            res.redirect('/cart');
        })
        .catch(err => {
            console.error(err);
        });
};


exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            res.render('shop/product-details', {
                product: product,
                path: '/product',
                pageTitle: `Product Details`,
            });
        })
        .catch(err => {
            console.log(err);
        });
};


exports.removeFromCart = (req, res, next) => {
    const prodId = req.body.id;
    req.user.removeFromCart(prodId)
        .then(result => {
            res.redirect('/cart');
        })
        .catch(err => {
            console.log(err);
        });
};

exports.getOrders = (req, res, next) => {
    Order.find({ "user.userId": req.user._id })
        .then(orders => {
            res.render('shop/orders', {
                path: '/orders',
                pageTitle: "Orders page",
                orders: orders
            });
        })
        .catch(err => {
            console.error(err);
        });
};


exports.postOrder = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .then(user => {
            const cartProducts = user.cart.items.map(item => {
                return {
                    product: item.productId,
                    quantity: item.quantity
                };
            });

            const order = new Order({
                user: {
                    name: req.user.name,
                    userId: req.user
                },
                products: cartProducts
            });

            return order.save();
        })
        .then(result => {
            req.user.cart.items = [];
            return req.user.save();
        })
        .then(() => {
            res.redirect('/orders');
        })
        .catch(err => {
            console.log(err);
            res.status(500).render('error', { errorMessage: 'Unable to place order.' });
        });
};

