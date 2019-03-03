import { importHtml, Q, ajax } from "/msa/msa.js"

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
		display:flex;
		flex-direction:column;
		align-items: center;
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
	<span class="counts">
		<span class="count">-</span>
		<span class="nb"></span>
	</span>
	<button class="yes">+</button>`

export class HTMLMsaVoteElement extends HTMLElement {

	connectedCallback() {
		this.Q = Q
		this.initAttrs()
		this.initContent()
		this.initActions()
		if(this.nb !== null) this.initVotesCount()
		else this.getVotesCount()
	}

	defAttribute(key, defVal){
		return this.hasAttribute(key) ? this.getAttribute(key) : defVal
	}

	initAttrs(){
		this.baseUrl = this.getAttribute("base-url")
		this.key = this.getAttribute("key")
		this.sum = JSON.parse(this.getAttribute("sum"))
		this.nb = JSON.parse(this.getAttribute("nb"))
	}

	initContent(){
		this.innerHTML = content
	}

	initActions(){
		this.Q("button.no").onclick = () => this.postVote(0)
		this.Q("button.yes").onclick = () => this.postVote(1)
	}

	getVotesCount(){
		ajax("GET", `${this.baseUrl}/_count/${this.key}`, count => {
			if(count) Object.assign(this, count)
			this.initVotesCount()
		})
	}

	initVotesCount(){
		const { sum, nb } = this
		this.Q(".count").textContent = nb ? Math.round(100 * sum / nb)+"%" : "-"
		this.Q(".nb").textContent = nb + ' voter' + (nb > 1 ? 's' : '')
	}

	postVote(vote){
		ajax("POST", `${this.baseUrl}/_vote/${this.key}`,
			{ body:{ vote }},
			() => this.getVotesCount() )
	}
}

customElements.define("msa-vote", HTMLMsaVoteElement)
