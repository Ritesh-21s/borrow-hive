const Listing = require('../models/Listing');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/pushNotification');

/**
 * GET /api/listings
 * Community-scoped, returns only OPEN listings, supports search, category, type (sell/buy) filters
 */
const getListings = async (req, res, next) => {
  try {
    const { search, category, type, condition, sort = 'newest', page = 1, limit = 20 } = req.query;
    const communityId = req.user.communityId;

    // List screens query ONLY open listings
    const filter = {
      communityId,
      status: { $in: ['open', 'active'] },
      deletedAt: null,
    };

    if (category && category !== 'all' && category !== 'All') {
      filter.category = category.toLowerCase();
    }

    if (type && type !== 'all' && type !== 'All') {
      if (type === 'sell' || type === 'sale') {
        filter.type = { $in: ['sell', 'sale', 'both'] };
      } else if (type === 'buy') {
        filter.type = 'buy';
      } else {
        filter.type = type;
      }
    }

    if (condition) filter.condition = condition;
    if (search) filter.$text = { $search: search };

    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
    };

    const listings = await Listing.find(filter)
      .sort(sortOptions[sort] || { createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('ownerId', 'name avatar rating reviewCount');

    const total = await Listing.countDocuments(filter);

    return res.json({
      success: true,
      data: { listings, total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/listings
 */
const createListing = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      price,
      budget,
      condition,
      acceptedConditions,
      type = 'sell',
      images,
      imageUrl,
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Product name / title is required.' });
    }

    // Validation per type
    if (type === 'sell' || type === 'sale') {
      const hasImage = (images && images.length > 0) || imageUrl;
      if (!hasImage) {
        return res.status(400).json({ success: false, message: 'An image is required for a Sell Request.' });
      }
    }

    const imgList = images && images.length > 0
      ? images
      : imageUrl
      ? [{ url: imageUrl, publicId: '' }]
      : [];

    const finalImageUrl = imageUrl || (imgList.length > 0 ? imgList[0].url : '');

    const listing = await Listing.create({
      title,
      description: description || '',
      category: category || 'other',
      price: price || budget || 0,
      budget: budget || price || 0,
      condition: condition || (acceptedConditions && acceptedConditions[0]) || 'good',
      acceptedConditions: acceptedConditions || (condition ? [condition] : []),
      type,
      images: imgList,
      imageUrl: finalImageUrl,
      status: 'open',
      ownerId: req.user._id,
      communityId: req.user.communityId,
    });

    const populated = await listing.populate('ownerId', 'name avatar rating');

    const typeLabel = type === 'buy' ? 'Buy request' : 'Sell listing';
    await sendPushNotification({
      pushToken: req.user.pushToken,
      user: req.user,
      type: 'listing_published',
      title: `${typeLabel} published`,
      body: `Your ${typeLabel.toLowerCase()} "${title}" is now open in your community.`,
      data: { listingId: listing._id },
    });

    return res.status(201).json({ success: true, message: 'Listing created.', data: { listing: populated } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/listings/:id
 */
const getListing = async (req, res, next) => {
  try {
    const listing = await Listing.findOne({
      _id: req.params.id,
      deletedAt: null,
    }).populate('ownerId', 'name avatar rating reviewCount communityId');

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }
    if (listing.communityId.toString() !== req.user.communityId.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to access this listing.' });
    }

    return res.json({ success: true, data: { listing } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/listings/:id
 */
const updateListing = async (req, res, next) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, deletedAt: null });
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }
    if (listing.communityId.toString() !== req.user.communityId.toString()) {
      return res.status(403).json({ success: false, message: 'Cross-community access denied.' });
    }
    if (listing.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the listing owner can edit this.' });
    }

    const prevStatus = listing.status;
    const allowed = [
      'title', 'description', 'category', 'price', 'budget',
      'condition', 'acceptedConditions', 'type', 'images', 'imageUrl', 'status',
    ];

    allowed.forEach((key) => {
      if (req.body[key] !== undefined) listing[key] = req.body[key];
    });

    if (req.body.imageUrl && (!listing.images || listing.images.length === 0)) {
      listing.images = [{ url: req.body.imageUrl, publicId: '' }];
    }

    await listing.save();

    // Closing notification
    if ((req.body.status === 'closed' || req.body.status === 'sold') && prevStatus !== 'closed') {
      const isBuy = listing.type === 'buy';
      const actionWord = isBuy ? 'bought' : 'sold';
      await sendPushNotification({
        pushToken: req.user.pushToken,
        user: req.user,
        type: 'listing_published',
        title: `Item marked as ${actionWord} ✅`,
        body: `"${listing.title}" is now closed and removed from public listings.`,
        data: { listingId: listing._id },
      });
    }

    return res.json({ success: true, message: 'Listing updated.', data: { listing } });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/listings/:id — SOFT CLOSE
 */
const deleteListing = async (req, res, next) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, deletedAt: null });
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }
    if (listing.communityId.toString() !== req.user.communityId.toString()) {
      return res.status(403).json({ success: false, message: 'Cross-community access denied.' });
    }
    if (listing.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the listing owner can delete this.' });
    }

    listing.deletedAt = new Date();
    listing.status = 'closed';
    await listing.save();

    return res.json({ success: true, message: 'Listing closed and removed from listings.' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/listings/my
 */
const getMyListings = async (req, res, next) => {
  try {
    const listings = await Listing.find({
      ownerId: req.user._id,
      communityId: req.user.communityId,
      deletedAt: null,
    }).sort({ createdAt: -1 });

    return res.json({ success: true, data: { listings } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getListings, createListing, getListing, updateListing, deleteListing, getMyListings };
