const { User, Book } = require('../models');
const { AuthenticationError } = require('apollo-server-express');
const { signToken } = require('../utils/auth');

const resolvers = {
    Query: {
        me: async (parent, args, context) => {
            if (context.user) {
                const userData = await User.findOne({ _id: context.user._id })
                    .select('-__v -password')
                    .populate('bookCount')
                    .populate('savedBooks')

                return userData;
            }

            throw new AuthenticationError('Not logged in');
        },
        savedBooks: async (parent, { authors }) => {
            const params = authors ? { authors } : {};
            return Book.find(params).sort({ createdAt: -1 });
        },
    },

    //                                                                              <-----Mutations start here
    Mutation: {
        //Add a User
        addUser: async (parent, args) => {
            const user = await User.create(args);
            const token = signToken(user);

            return { token, user };
        },

        //Login
        login: async (parent, { email, password }) => {
            const user = await User.findOne({ email });

            if (!user) {
                throw new AuthenticationError('Incorrect credentials');
            }

            const correctPw = await user.isCorrectPassword(password);

            if (!correctPw) {
                throw new AuthenticationError('Incorrect credentials');
            }

            const token = signToken(user);
            return { token, user };
        },

        //Save a book to a user
        saveBook: async (parent, { saveBookInput }, context) => {
            if (context.user) {
                const updatedUser = await User.findOneAndUpdate(
                    { _id: context.user._id },
                    { $addToSet: { saveBook: { saveBookInput } } },
                    { new: true, runValidators: true }
                );

                return updatedUser;
            }

            throw new AuthenticationError('You need to be logged in!');
        },

        //Delete a book from a user
        removeBook: async (parent, { bookId }, context) => {
            if (context.user) {
                const updatedUser = await User.findOneAndUpdate(
                    { _id: context.user._id },
                    { $pull: { saveBook: { bookId: bookId } } },
                    { new: true, runValidators: true }
                );

                if (!updatedUser) {
                    return res.status(404).json({ message: "Couldn't find user with this id!" });
                }
                return res.json(updatedUser);
            }
        },
    }
};

module.exports = resolvers;