function makeBookmarksArray() {
    return [
        {
            id: 1,
            title: 'first bookmark',
            url: 'someplace.com',
            description: 'Lorem some stuff',
            rating: 1,
        },
        {
            id: 2,
            title: 'first bookmark',
            url: 'someplace.com',
            description: 'Lorem some stuff',
            rating: 1,
        },
        {
            id: 3,
            title: 'first bookmark',
            url: 'someplace.com',
            description: 'Lorem some stuff',
            rating: 1,
        },
        {
            id: 4,
            title: 'first bookmark',
            url: 'someplace.com',
            description: 'Lorem some stuff',
            rating: 1,
        },
        {
            id: 5,
            title: 'first bookmark',
            url: 'someplace.com',
            description: 'Lorem some stuff',
            rating: 1,
        },
        {
            id: 6,
            title: 'first bookmark',
            url: 'someplace.com',
            description: 'Lorem some stuff',
            rating: 1,
        },
        {
            id: 7,
            title: 'first bookmark',
            url: 'someplace.com',
            description: 'Lorem some stuff',
            rating: 1,
        },
        {
            id: 8,
            title: 'first bookmark',
            url: 'someplace.com',
            description: 'Lorem some stuff',
            rating: 1,
        },
        {
            id: 9,
            title: 'first bookmark',
            url: 'someplace.com',
            description: 'Lorem some stuff',
            rating: 1,
        },
        {
            id: 10,
            title: 'first bookmark',
            url: 'someplace.com',
            description: 'Lorem some stuff',
            rating: 1,
        }
    ]
}

function makeMaliciousBookmark() {
    const maliciousBookmark = {
        id: 911,
        url: 'www.<script>alert("xss");</script>.com',
        title: 'Naughty naughty very naughty <script>alert("xss");</script>',
        description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
        rating: 4
    }
    const expectedBookmark = {
        ...maliciousBookmark,
        title: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
        url: 'www.&lt;script&gt;alert(\"xss\");&lt;/script&gt;.com',
        description: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`,  
    }
    return {
        maliciousBookmark,
        expectedBookmark,
    }
}

module.exports = { makeBookmarksArray, makeMaliciousBookmark }