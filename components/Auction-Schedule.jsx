import React, { useEffect, useState } from 'react';
import { PolkadotAuctions, KusamaAuctions } from './utilities/auctions';
import { ApiPromise, WsProvider } from "@polkadot/api";

let options = [];
let wsProvider = undefined;

// Component for displaying auction data
function AuctionSchedule() {
	const [auctions, setAuctions] = useState("Loading Auctions...");

	useEffect(async () => {
		const title = document.title;
		if (title === "Parachain Slot Auctions · Polkadot Wiki") {
			const chain = "Polkadot";
			wsProvider = new WsProvider("wss://rpc.polkadot.io");
			LoadOptions(PolkadotAuctions);
			LoadBlockCacheThenUpdate(chain, PolkadotAuctions, setAuctions, { target: { value: 0 } })
		}
		else if (title === "Parachain Slot Auctions · Guide") {
			const chain = "Kusama";
			wsProvider = new WsProvider("wss://kusama-rpc.polkadot.io");
			LoadOptions(KusamaAuctions);
			LoadBlockCacheThenUpdate(chain, KusamaAuctions, setAuctions, { target: { value: 0 } })
		}
		else {
			console.log(title);
			console.log("Unknown wiki/guide type");
		}
	}, []);

	// Render
	if (auctions !== undefined) {
		return auctions;
	} else {
		return (<div>Loading auction data...</div>)
	}
}

// Loads hard-coded auction default values
function LoadOptions(auctions) {
	for (let i = 0; i < auctions.length; i++) {
		const option = <option value={i} key={i}>{`Auction #${i} at Block #${auctions[i]["startBlock"]}`}</option>
		options.push(option);
	}
}

// Renders default value prior to initializing on-chain retrieval
function LoadBlockCacheThenUpdate(chain, defaultAuctions, setAuctions, e) {
	const index = e.target.value;
	const auctions = Render(chain, defaultAuctions, setAuctions, index);
	GetChainData(chain, auctions, setAuctions, index)
}

// Connect to a chain, retrieve required values, re-render
async function GetChainData(chain, auctions, setAuctions, index) {
	const api = await ApiPromise.create({ provider: wsProvider });

	// Get the current block for projection
	const currentBlock = await api.rpc.chain.getBlock();
	const currentBlockNumber = currentBlock.block.header.number.toPrimitive();

	// Get current on-chain date/time
	const chainTimestamp = await api.query.timestamp.now();
	const date = new Date(chainTimestamp.toPrimitive());

	// Dates
	// TODO - estimates should only be made for future block, otherwise use on-chain timestamp
	if (currentBlockNumber > auctions[index].startBlock) {
		console.log("start block has already occurred");
	} else {
		console.log("start block has not yet occurred");
	}
	auctions[index].startDate = EstimateBlockDate(date, currentBlockNumber, auctions[index].startBlock);
	auctions[index].endPeriodDate = EstimateBlockDate(date, currentBlockNumber, auctions[index].endPeriodBlock);
	auctions[index].biddingEndsDate = EstimateBlockDate(date, currentBlockNumber, auctions[index].biddingEndsBlock);
	auctions[index].onboard = "TODO";
	// TODO - how to get this value?
	//auctions[index].startOnBoard = "test1";
	//auctions[index].endOnBoard = "test2";
	//auctions[index].endOnBoard = weeksLeased * 7 + auction.startOnBoard;

	Render(chain, auctions, setAuctions, index);
}

// Estimate a future blocks date based on 6 second block times
function EstimateBlockDate(date, currentBlock, estimatedBlock) {
	const blockDifference = estimatedBlock - currentBlock;
	const seconds = blockDifference * 6;
	const dateCopy = new Date(date.valueOf())
	dateCopy.setSeconds(dateCopy.getSeconds() + seconds);
	return dateCopy.toDateString();
}

// Update JSX
function Render(chain, auctions, setAuctions, index) {
	let explorerUrl = undefined;
	if (chain === "Polkadot") {
		explorerUrl = "https://polkadot.subscan.io/block/";
	} else if (chain === "Kusama") {
		explorerUrl = "https://kusama.subscan.io/block/";
	}

	// If still calculating date estimation, inform user
	if (auctions[index].hasOwnProperty("startDate") === false) {
		const msg = "Estimating block date...";
		auctions[index]["startDate"] = msg;
		auctions[index]["endPeriodDate"] = msg;
		auctions[index]["biddingEndsDate"] = msg;
	}

	const content = <div>
		<select id="AuctionSelector" onChange={(e) => LoadBlockCacheThenUpdate(chain, auctions, setAuctions, e)} style={{ border: '2px solid #e6007a', height: '40px' }}>
			{options.map((option) => (option))}
		</select>
		<hr />
		<b>Auction Starts:</b>
		<br />
		{`${auctions[index].startDate} - `}
		<a href={`${explorerUrl}${auctions[index].startBlock}`}>
			Block #{auctions[index].startBlock}
		</a>
		<hr />
		<b>Auction Ends:</b>
		<br />
		{`${auctions[index].endPeriodDate} - `}
		<a href={`${explorerUrl}${auctions[index].endPeriodBlock}`}>
			Block #{auctions[index].endPeriodBlock}
		</a>
		<hr />
		<b>Bidding Ends:</b>
		<br />
		{`${auctions[index].biddingEndsDate} - `}
		<a href={`${explorerUrl}${auctions[index].biddingEndsBlock}`}>
			Block #{auctions[index].biddingEndsBlock}
		</a>
		<hr />
		<b>Winning parachain(s) onboarded:</b>
		<br />
		{auctions[index].onboard}
		<hr />
		<p style={{ color: "#6c757d" }}>
			The dates (based on UTC) and block numbers listed above can change based on network block production and the potential for skipped blocks.
			Click on the block number for an up-to-date estimate.
		</p>
	</div>

	setAuctions(content);
	return auctions;
}

export default AuctionSchedule;