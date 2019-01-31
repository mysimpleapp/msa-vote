import { Q, ajax } from "/msa/msa.js"

const content = `
	<button class="no">-</button> <span class="count">-</span> <button class="yes">+</button>`

export class HTMLMsaVoteElement extends HTMLElement {

	connectedCallback() {
		this.Q = Q
		this.baseUrl = this.getAttribute("base-url")
		this.key = this.getAttribute("key")
		this.initContent()
		this.initActions()
		this.getVotesCount()
	}

	initContent(){
		this.innerHTML = content
	}

	initActions(){
		this.Q("button.no").onclick = () => this.postVote(0)
		this.Q("button.yes").onclick = () => this.postVote(1)
	}

	getVotesCount(){
		ajax("GET", `${this.baseUrl}/_count/${this.key}`, count =>
			this.initVotesCount(count))
	}

	initVotesCount({ sum, nb }){
		this.sum = sum
		this.nb = nb
		this.Q(".count").textContent = nb ? (sum / nb) : 0
	}

	postVote(vote){
		ajax("POST", `${this.baseUrl}/_vote/${this.key}`,
			{ body:{ vote }},
			() => this.getVotesCount() )
	}
}

customElements.define("msa-vote", HTMLMsaVoteElement)
