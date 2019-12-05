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
		this.initAttrs()
		this.initContent()
		this.initActions()
		if(this.nb !== null) this.initVotesCount()
		else this.getVotesCount()
	}

	getAttributeOr(key, defVal){
		return this.hasAttribute(key) ? this.getAttribute(key) : defVal
	}

	initAttrs(){
		this.baseUrl = this.getAttribute("base-url")
		this.key = this.getAttribute("key")
		this.sum = JSON.parse(this.getAttribute("sum"))
		this.nb = JSON.parse(this.getAttribute("nb"))
		this.canVote = JSON.parse(this.getAttributeOr("can-vote", "true"))
	}

	initContent(){
		this.innerHTML = content
		if(!this.canVote){
			this.Q("button.yes").style.visibility = "hidden"
			this.Q("button.no").style.visibility = "hidden"
		}
	}

	initActions(){
		this.Q("button.no").onclick = () => this.postVote(0)
		this.Q("button.yes").onclick = () => this.postVote(1)
	}

	getVotesCount(){
		ajax("GET", `${this.baseUrl}/_count/${this.key}`,
			{ loadingDom: this.Q(".counts") },
			count => {
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
			{
				body:{ vote },
				loadingDom: this.Q(".counts")
			},
			() => this.getVotesCount() )
	}
}

customElements.define("msa-vote", HTMLMsaVoteElement)
