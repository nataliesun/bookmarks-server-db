
const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray, makeMaliciousBookmark } = require('./bookmarks.fixtures')

describe('Bookmarks Endpoints', function () {
    let db

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL
        })
        app.set('db', db)
    })

    after('disconnect from db', () => db.destroy())

    before('clean the table', () => db('bookmarks').truncate())

    afterEach('cleanup', () => db('bookmarks').truncate())

    describe('GET /bookmarks', () => {

        context('Given there are no bookmarks in the database', () => {
            it('GET /bookmarks resolves to an empty array', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .expect(200, [])
            })
            it(`responds with 404`, () => {
                const bookmarkId = 2
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .expect(404, { error: { message: `Bookmark doesn't exist` } })
            })
    
        })

        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray()
            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            it('GET /bookmarks responds with 200 and all of the bookmarks', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .expect(200, testBookmarks)
            })
            it('GET /bookmarks/:bookmark_id responds with 200 and the specified bookmark', () => {
                const bookmarkId = 2
                const expectedBookmark = testBookmarks[bookmarkId - 1]
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .expect(200, expectedBookmark)
            })
        })
    })
    describe(`POST /bookmarks`, () => {
        it(`creates a bookmark, responding with 201 and the new bookmark`, () => {
            const newBookmark = {
                title: 'Test new bookmark',
                url: 'www.test.com',
                description: 'Test new bookmark description...',
                rating: 4
            }
            return supertest(app)
                .post('/bookmarks')
                .send(newBookmark)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newBookmark.title)
                    expect(res.body.url).to.eql(newBookmark.url)
                    expect(res.body.description).to.eql(newBookmark.description)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`)
                })
                .then(res =>
                    supertest(app)
                        .get(`/bookmarks/${res.body.id}`)
                        .expect(res.body)
                )
        })

        const requiredFields = ['title', 'url', 'description', 'rating']

        requiredFields.forEach(field => {
            const newBookmark = {
                title: 'Test new bookmark',
                url: 'www.test.com',
                description: 'Test new bookmark description...',
                rating: 5
            }

            it(`responds with 400 and an error message when the '${field}' is missing`, () => {
                delete newBookmark[field]

                return supertest(app)
                    .post('/bookmarks')
                    .send(newBookmark)
                    .expect(400, {
                        error: { message: `Missing '${field}' in request body` }
                    })
            })
        })

        it('removes XSS attack content from response', () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()
            return supertest(app)
                .post(`/bookmarks`)
                .send(maliciousBookmark)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedBookmark.title)
                    expect(res.body.description).to.eql(expectedBookmark.description)
                    expect(res.body.url).to.eql(expectedBookmark.url)
                })
        })
    })

    describe('DELETE /bookmarks/:bookmark_id', () => {
        context('Given there are no bookmarks', () => {
            it(`responds with 404`, () => {
                const bookmark_id = 8928
                return supertest(app)
                    .delete(`/bookmarks/${bookmark_id}`)
                    .expect(404, { error: { message:"bookmark doesn't exist" }})
                })
        })

        context('Given there are bookmarks', () => {
            const testBookmarks = makeBookmarksArray()

            beforeEach('Inserts bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            it(`responds with 204 and removes the bookmark`, () => {
                const idToRemove = 2
                const expectedBookmarks = testBookmarks.filter(bookmark => 
                    bookmark.id !== idToRemove
                )
                return supertest(app)
                    .delete(`/bookmarks/${idToRemove}`)
                    .expect(204)
                    .then(() => 
                        supertest(app)
                            .get(`/bookmarks`)
                            .expect(expectedBookmarks)
                    )
            })
            
        })
    })


})


