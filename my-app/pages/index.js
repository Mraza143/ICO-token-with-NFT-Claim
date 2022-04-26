import { BigNumber, Contract, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import {
  NFT_CONTRACT_ABI,
  NFT_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ABI,
  TOKEN_CONTRACT_ADDRESS,
} from "../constants";
import styles from "../styles/Home.module.css";

export default function Home() {

  const zero = BigNumber.from(0);
  const [walletConnected, setWalletConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokensToBeClaimed, setTokensToBeClaimed] = useState(zero);
  const [balanceOfCryptoDevTokens, setBalanceOfCryptoDevTokens] = useState(zero);
  const [tokenAmount, setTokenAmount] = useState(zero);
  const [tokensMinted, setTokensMinted] = useState(zero);
  const web3ModalRef = useRef();


  const getTokensToBeClaimed = async () => {
    try {

      const provider = await getProviderOrSigner();

      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        provider
      );
      // Create an instance of tokenContract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      const signer = await getProviderOrSigner(true);
      const address = await signer.getAddress();
      const balance = await nftContract.balanceOf(address);
      if (balance === zero) {
        setTokensToBeClaimed(zero);
      } else {
        var amount = 0;

        for (var i = 0; i < balance; i++) {
          const tokenId = await nftContract.tokenOfOwnerByIndex(address, i);
          const claimed = await tokenContract.tokenIdsClaimed(tokenId);
          if (!claimed) {
            amount++;
          }
        }

        setTokensToBeClaimed(BigNumber.from(amount));
      }
    } catch (err) {
      console.error(err);
      setTokensToBeClaimed(zero);
    }
  };


  const getBalanceOfCryptoDevTokens = async () => {
    try {

      const provider = await getProviderOrSigner();
      // Create an instace of token contract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      // We will get the signer now to extract the address of the currently connected MetaMask account
      const signer = await getProviderOrSigner(true);
      // Get the address associated to the signer which is connected to  MetaMask
      const address = await signer.getAddress();
      // call the balanceOf from the token contract to get the number of tokens held by the user
      const balance = await tokenContract.balanceOf(address);
      // balance is already a big number, so we dont need to convert it before setting it
      setBalanceOfCryptoDevTokens(balance);
    } catch (err) {
      console.error(err);
      setBalanceOfCryptoDevTokens(zero);
    }
  };

  const mintCryptoDevToken = async (amount) => {
    try {
      // We need a Signer here since this is a 'write' transaction.
      // Create an instance of tokenContract
      const signer = await getProviderOrSigner(true);
      // Create an instance of tokenContract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );
      // Each token is of `0.001 ether`. The value we need to send is `0.001 * amount`
      const value = 0.001 * amount;
      const tx = await tokenContract.mint(amount, {
        // value signifies the cost of one crypto dev token which is "0.001" eth.
        // We are parsing `0.001` string to ether using the utils library from ethers.js
        value: utils.parseEther(value.toString()),
      });
      setLoading(true);
      // wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      window.alert("Sucessfully minted Crypto Dev Tokens");
      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * claimCryptoDevTokens: Helps the user claim Crypto Dev Tokens
   */
  const claimCryptoDevTokens = async () => {
    try {
      // We need a Signer here since this is a 'write' transaction.
      // Create an instance of tokenContract
      const signer = await getProviderOrSigner(true);
      // Create an instance of tokenContract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );
      const tx = await tokenContract.claim();
      setLoading(true);
      // wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      window.alert("Sucessfully claimed Crypto Dev Tokens");
      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * getTotalTokensMinted: Retrieves how many tokens have been minted till now
   * out of the total supply
   */
  const getTotalTokensMinted = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // No need for the Signer here, as we are only reading state from the blockchain
      const provider = await getProviderOrSigner();
      // Create an instance of token contract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      // Get all the tokens that have been minted
      const _tokensMinted = await tokenContract.totalSupply();
      setTokensMinted(_tokensMinted);
    } catch (err) {
      console.error(err);
    }
  };
  /**
   * Returns a Provider or Signer object representing the Ethereum RPC with or without the
   * signing capabilities of metamask attached
   *
   * A `Provider` is needed to interact with the blockchain - reading transactions, reading balances, reading state, etc.
   *
   * A `Signer` is a special type of Provider used in case a `write` transaction needs to be made to the blockchain, which involves the connected account
   * needing to make a digital signature to authorize the transaction being sent. Metamask exposes a Signer API to allow your website to
   * request signatures from the user using Signer functions.
   *
   * @param {*} needSigner - True if you need the signer, default false otherwise
   */
  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to Metamask
    // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Rinkeby network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("Change the network to Rinkeby");
      throw new Error("Change network to Rinkeby");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  /*
        connectWallet: Connects the MetaMask wallet
      */
  const connectWallet = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // When used for the first time, it prompts the user to connect their wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  // useEffects are used to react to changes in state of the website
  // The array at the end of function call represents what state changes will trigger this effect
  // In this case, whenever the value of `walletConnected` changes - this effect will be called
  useEffect(() => {
    // if wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
    if (!walletConnected) {
      // Assign the Web3Modal class to the reference object by setting it's `current` value
      // The `current` value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getTotalTokensMinted();
      getBalanceOfCryptoDevTokens();
      getTokensToBeClaimed();
    }
  }, [walletConnected]);

  /*
        renderButton: Returns a button based on the state of the dapp
      */
  const renderButton = () => {
    // If we are currently waiting for something, return a loading button
    if (loading) {
      return (
        <div>
          <button className={styles.button}>Loading...</button>
        </div>
      );
    }
    // If tokens to be claimed are greater than 0, Return a claim button
    if (tokensToBeClaimed > 0) {
      return (
        <div>
          <div className={styles.description}>
            {tokensToBeClaimed * 10} Tokens can be claimed!
          </div>
          <button className={styles.button} onClick={claimCryptoDevTokens}>
            Claim Tokens
          </button>
        </div>
      );
    }
    // If user doesn't have any tokens to claim, show the mint button
    return (
      <div style={{ display: "flex-col" }}>
        <div>
          <input
            type="number"
            placeholder="Amount of Tokens"
            // BigNumber.from converts the `e.target.value` to a BigNumber
            onChange={(e) => setTokenAmount(BigNumber.from(e.target.value))}
            className={styles.input}
          />
        </div>

        <button
          className={styles.button}
          disabled={!(tokenAmount > 0)}
          onClick={() => mintCryptoDevToken(tokenAmount)}
        >
          Mint Tokens
        </button>
      </div>
    );
  };

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="ICO-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs ICO!</h1>
          <div className={styles.description}>
            You can claim or mint Crypto Dev tokens here
          </div>
          {walletConnected ? (
            <div>
              <div className={styles.description}>
                {/* Format Ether helps us in converting a BigNumber to string */}
                You have minted {utils.formatEther(balanceOfCryptoDevTokens)} Crypto
                Dev Tokens
              </div>
              <div className={styles.description}>
                {/* Format Ether helps us in converting a BigNumber to string */}
                Overall {utils.formatEther(tokensMinted)}/10000 have been minted!!!
              </div>
              {renderButton()}
            </div>
          ) : (
            <button onClick={connectWallet} className={styles.button}>
              Connect your wallet
            </button>
          )}
        </div>
        <div>
          <img className={styles.image} src="./0.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  );
}