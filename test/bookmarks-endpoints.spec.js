
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

    describe('GET /api/bookmarks', () => {

        context('Given there are no bookmarks in the database', () => {
            it('GET /api/bookmarks resolves to an empty array', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .expect(200, [])
            })
            it(`responds with 404`, () => {
                const bookmarkId = 2
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
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

            it('GET /api/bookmarks responds with 200 and all of the bookmarks', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .expect(200, testBookmarks)
            })
            it('GET /api/bookmarks/:bookmark_id responds with 200 and the specified bookmark', () => {
                const bookmarkId = 2
                const expectedBookmark = testBookmarks[bookmarkId - 1]
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
                    .expect(200, expectedBookmark)
            })
        })
    })
    describe(`POST /api/bookmarks`, () => {
        it(`creates a bookmark, responding with 201 and the new bookmark`, () => {
            const newBookmark = {
                title: 'Test new bookmark',
                url: 'www.test.com',
                description: 'Test new bookmark description...',
                rating: 4
            }
            return supertest(app)
                .post('/api/bookmarks')
                .send(newBookmark)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newBookmark.title)
                    expect(res.body.url).to.eql(newBookmark.url)
                    expect(res.body.description).to.eql(newBookmark.description)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
                })
                .then(res =>
                    supertest(app)
                        .get(`/api/bookmarks/${res.body.id}`)
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
                    .post('/api/bookmarks')
                    .send(newBookmark)
                    .expect(400, {
                        error: { message: `Missing '${field}' in request body` }
                    })
            })
        })

        it('removes XSS attack content from response', () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()
            return supertest(app)
                .post(`/api/bookmarks`)
                .send(maliciousBookmark)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedBookmark.title)
                    expect(res.body.description).to.eql(expectedBookmark.description)
                    expect(res.body.url).to.eql(expectedBookmark.url)
                })
        })
    })

    describe('DELETE /api/bookmarks/:bookmark_id', () => {
        context('Given there are no bookmarks', () => {
            it(`responds with 404`, () => {
                const bookmark_id = 8928
                return supertest(app)
                    .delete(`/api/bookmarks/${bookmark_id}`)
                    .expect(404, { error: { message:"Bookmark doesn't exist" }})
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
                    .delete(`/api/bookmarks/${idToRemove}`)
                    .expect(204)
                    .then(() => 
                        supertest(app)
                            .get(`/api/bookmarks`)
                            .expect(expectedBookmarks)
                    )
            })
            
        })
    })
    describe(`PATCH /api/bookmarks/:bookmark_id`, () => {
        context(`Given there are no bookmarks`, () => {
            it(`responds with 404`, () => {
                const bookmarkId = 12435
                return supertest(app)
                    .delete(`/api/bookmarks/${bookmarkId}`)
                    .expect(404, {error: { message: `Bookmark doesn't exist`}})
            })
        })
        context(`Given there are bookmarks`, () => {
            const testBookmarks = makeBookmarksArray()

            beforeEach('inserts bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            it('responds with 204 and updates bookmark', () => {
                const idToUpdate = 3
                const updateBookmark = {
                    title: 'updated title',
                    url: 'something@somewhere.com',
                    description: 'updated description',
                    rating: 2
                }
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updateBookmark
                }
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .send(updateBookmark)
                    .expect(204)
                    .then(res => 
                            supertest(app)
                                .get(`/api/bookmarks/${idToUpdate}`)
                                .expect(expectedBookmark)
                        )
            })

            it(`responds with 400 when no required field provided`, () => {
                const idToUpdate = 3
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .send({ irrelaventFild: 'foo' })
                    .expect(400, {
                        error: {
                            message: `Request body must contain either 'title', 'url', 'description', 'rating'`
                        }
                    })
            })

            it(`responds with 204 when updating only a subset of fields`, () => {
                const idToUpdate = 3
                const updateBookmark = {
                    title: 'update bookmark title to this',
                }
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updateBookmark
                }

                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .send({
                        ...updateBookmark,
                        fieldToIgnore: 'should not be in a GET response'
                    })
                    .expect(204)
                    .then(res => 
                            supertest(app)
                                .get(`/api/bookmarks/${idToUpdate}`)
                                .expect(expectedBookmark)
                        )
            })
        })
    })


})


