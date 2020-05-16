import { importHtml, Q, ajax } from "/utils/msa-utils.js"

importHtml(`<style>
	msa-vote {
		display: flex;
		flex-direction: row;
		align-items: center;
	}
	msa-vote button {
		padding: .2em
/*		height: 2em; */
	}
	msa-vote .counts {
		padding: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
	}
	msa-vote .count {
		font-weight: bold;
	}
	msa-vote .nb {
		font-size: .8em;
	}
</style>`)

const content = `
	<button class="no">-</button>
	<span class="counts" style="position: relative">
		<span class="count msa-loading-invisible">-</span>
		<span class="nb msa-loading-invisible"></span>
		<msa-loader style="position: absolute"></msa-loader>
	</span>
	<button class="yes">+</button>`

export class HTMLMsaVoteElement extends HTMLElement {

	connectedCallback() {
		this.Q = Q
		this.initContent()
		this.initActions()
		if (this.getNb() !== null) this.initVotesCount()
		else this.getVotesCount()
	}

	getBaseRoute() {
		if (this.hasAttribute("base-route")) // TODO: deprecate
			return this.getAttribute("base-route")
		return this.baseRoute
	}
	getVoteId() { return this.getAttribute("vote-id") }
	getSum() {
		if (this.sum !== undefined) return this.sum
		return JSON.parse(this.getAttribute("sum"))
	}
	getNb() {
		if (this.nb !== undefined) return this.nb
		return JSON.parse(this.getAttribute("nb"))
	}
	getCanVote() {
		if (this.hasAttribute("can-vote"))
			return JSON.parse(this.getAttribute("can-vote"))
		return true
	}

	initContent() {
		this.innerHTML = content
		if (!this.getCanVote()) {
			this.Q("button.yes").style.visibility = "hidden"
			this.Q("button.no").style.visibility = "hidden"
		}
	}

	initActions() {
		this.Q("button.no").onclick = () => this.postVote(0)
		this.Q("button.yes").onclick = () => this.postVote(1)
	}

	getVotesCount() {
		ajax("GET", `${this.getBaseRoute()}/_count/${this.getVoteId()}`,
			{ loadingDom: this.Q(".counts") })
			.then(count => {
				if (count) Object.assign(this, count)
				this.initVotesCount()
			})
	}

	initVotesCount() {
		const sum = this.getSum()
		const nb = this.getNb()
		this.Q(".count").textContent = nb ? Math.round(100 * sum / nb) + "%" : "-"
		this.Q(".nb").textContent = nb + ' voter' + (nb > 1 ? 's' : '')
	}

	postVote(vote) {
		ajax("POST", `${this.getBaseRoute()}/_vote/${this.getVoteId()}`, {
			body: { vote },
			loadingDom: this.Q(".counts")
		})
			.then(() => this.getVotesCount())
	}
}

customElements.define("msa-vote", HTMLMsaVoteElement)

// box

export function createMsaBox(boxParent) {
	let id
	for (id = 1; ; ++id)
		if (!boxParent.querySelector(`msa-vote[vote-id='${id}']`))
			break
	const res = document.createElement("msa-vote")
	res.setAttribute("vote-id", id)
	return res
}

export function initMsaBox(el, ctx) {
	el.baseRoute = `${ctx.boxesRoute}/vote`
}

export function exportMsaBox(el) {
	return `<msa-vote vote-id="${el.voteId}"></msa-vote>`
}