const path = require('path')
const express = require('express')
const xss = require('xss')
const BookmarksService = require('./BookmarksService')


const bookmarksRouter = express.Router()
const jsonParser = express.json()


const serializeBookmark = bookmark => ({
    id: bookmark.id,
    title: xss(bookmark.title),
    url: xss(bookmark.url),
    description: xss(bookmark.description),
    rating: bookmark.rating,
})

bookmarksRouter
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        BookmarksService.getAllBookmarks(knexInstance)
            .then(bookmarks => {
                res.json(bookmarks.map(bookmark => ({
                    id: bookmark.id,
                    title: bookmark.title,
                    url: bookmark.url,
                    description: bookmark.description,
                    rating: bookmark.rating,
                })))
            })
            .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const { title, url, description, rating } = req.body
        const newBookmark = { title, url, description, rating }

        for (const [key, value] of Object.entries(newBookmark))
            if (value == null)
                return res.status(400).json({
                    error: { message: `Missing '${key}' in request body` }
                })

        BookmarksService.insertBookmark(
            req.app.get('db'),
            newBookmark
        )
            .then(bookmark => {
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `/${bookmark.id}`))
                    .json(serializeBookmark(bookmark))
            })
            .catch(next)
    })

    bookmarksRouter
    .route('/:bookmark_id')
    .get((req, res, next) => {
        BookmarksService.getBookmarkById(
            req.app.get('db'),
            req.params.bookmark_id
        )
            .then(bookmark => {
                if (!bookmark) {
                    return res.status(404).json({ error: { message: `Bookmark doesn't exist` } })
                }
                res.json({
                    id: bookmark.id,
                    title: bookmark.title,
                    url: bookmark.url,
                    description: bookmark.description,
                    rating: bookmark.rating,
                })
            })
            .catch(next)
    })
    .delete((req, res, next) => {
        BookmarksService.deleteBookmark(
            req.app.get('db'),
            req.params.bookmark_id
        )
        .then(numRowAffected => {
            if(!numRowAffected) {
                return res
                .status(404)
                .json({ error: { message:"Bookmark doesn't exist" }})
                next()
            }
            res
                .status(204)
                .end()
        })
        .catch(next)
    })
    .patch(jsonParser, (req, res, next) => {
        const { title, url, description, rating } = req.body
        const bookmarkToUpdate = { title, url, description, rating }

        const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length
        if (numberOfValues === 0)
            return res.status(400).json({
                error: {
                    message: `Request body must contain either 'title', 'url', 'description', 'rating'`
                }
            })
        BookmarksService.updateBookmark(
            req.app.get('db'),
            req.params.bookmark_id,
            bookmarkToUpdate
        )
            .then(numRowAffected => {
                res.status(204).end()
            })
            .catch(next)
    })

    module.exports = bookmarksRouter