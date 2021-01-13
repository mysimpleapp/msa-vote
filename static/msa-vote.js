import { importHtml, ajax } from "/utils/msa-utils.js"

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
		this.initContent()
		this.initActions()
		this.tryInitCounts()
	}

	getBaseRoute() {
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
			this.querySelector("button.yes").style.visibility = "hidden"
			this.querySelector("button.no").style.visibility = "hidden"
		}
	}

	initActions() {
		this.querySelector("button.no").onclick = () => this.postVote(0)
		this.querySelector("button.yes").onclick = () => this.postVote(1)
	}

	tryInitCounts() {
		if(this.getBaseRoute()) {
			if (this.getNb() !== null) this.initVotesCount()
			else this.getVotesCount()
		}
	}

	getVotesCount() {
		ajax("GET", `${this.getBaseRoute()}/_count/${this.getVoteId()}`,
			{ loadingDom: this.querySelector(".counts") })
			.then(count => {
				if (count) Object.assign(this, count)
				this.initVotesCount()
			})
	}

	initVotesCount() {
		const sum = this.getSum()
		const nb = this.getNb()
		this.querySelector(".count").textContent = nb ? Math.round(100 * sum / nb) + "%" : "-"
		this.querySelector(".nb").textContent = nb + ' voter' + (nb > 1 ? 's' : '')
	}

	postVote(vote) {
		ajax("POST", `${this.getBaseRoute()}/_vote/${this.getVoteId()}`, {
			body: { vote },
			loadingDom: this.querySelector(".counts")
		})
			.then(() => this.getVotesCount())
	}
}

customElements.define("msa-vote", HTMLMsaVoteElement)

// box

export async function createMsaBox(ctx) {
	const vote = await ajax("POST", `${ctx.boxesRoute}/vote/_vote`)
	const res = document.createElement("msa-vote")
	res.setAttribute("vote-id", vote.id)
	return res
}

export function initMsaBox(el, ctx) {
	el.baseRoute = `${ctx.boxesRoute}/vote`
	el.tryInitCounts()
}

export function exportMsaBox(el) {
	const res = document.createElement("msa-vote")
	res.setAttribute("vote-id", el.getVoteId())
	return res
}