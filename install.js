module.exports = async itf => {
	// create table in DB
	const { withDb } = Msa.require('db')
	await withDb(async db => {
		await db.run(
			`CREATE TABLE IF NOT EXISTS msa_vote_sets (
				id VARCHAR(255) PRIMARY KEY,
				sum INTEGER DEFAULT 0,
				nb INTEGER DEFAULT 0,
				params TEXT
			)`)
		await db.run(
			`CREATE TABLE IF NOT EXISTS msa_votes (
				id VARCHAR(255) NOT NULL,
				voter VARCHAR(255) NOT NULL,
				vote INTEGER,
				PRIMARY KEY (id, voter)
			)`)
	})
}
