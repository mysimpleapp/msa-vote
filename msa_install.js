module.exports = async itf => {
	// create table in DB
	const { VotesDb, VoteSetsDb } = require("./db")
	await VotesDb.sync()
	await VoteSetsDb.sync()
}

