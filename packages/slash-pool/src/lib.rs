//! WARDEN Stylus Slash Pool.
//!
//! This is the Rust/Stylus counterpart to the Solidity `SlashPool.sol`
//! reference contract. It tracks operator stake, one-use violation proofs, and
//! beneficiary balances. Token transfer integration is handled by the Solidity
//! reference today; this contract captures the cheaper verification state
//! machine targeted for Arbitrum Stylus.

#![cfg_attr(
    all(not(test), feature = "stylus-contract", not(feature = "export-abi")),
    no_main
)]

#[cfg(feature = "stylus-contract")]
extern crate alloc;

#[cfg(test)]
mod core;

#[cfg(feature = "stylus-contract")]
use stylus_sdk::{
    alloy_primitives::{Address, B256, U256},
    prelude::*,
};

#[cfg(feature = "stylus-contract")]
sol_storage! {
    #[entrypoint]
    pub struct SlashPool {
        mapping(address => uint256) stakes;
        mapping(address => uint256) beneficiary_balances;
        mapping(bytes32 => bool) used_proofs;
    }
}

#[cfg(feature = "stylus-contract")]
#[public]
impl SlashPool {
    pub fn stake_of(&self, operator: Address) -> U256 {
        self.stakes.get(operator)
    }

    pub fn beneficiary_balance_of(&self, beneficiary: Address) -> U256 {
        self.beneficiary_balances.get(beneficiary)
    }

    pub fn proof_used(&self, proof_hash: B256) -> bool {
        self.used_proofs.get(proof_hash)
    }

    pub fn deposit(&mut self, operator: Address, amount: U256) -> bool {
        if amount.is_zero() {
            return false;
        }

        let next_stake = self.stakes.get(operator) + amount;
        self.stakes.insert(operator, next_stake);
        true
    }

    pub fn submit_violation(
        &mut self,
        operator: Address,
        beneficiary: Address,
        amount: U256,
        proof_hash: B256,
    ) -> bool {
        if amount.is_zero() || beneficiary == Address::ZERO || self.used_proofs.get(proof_hash) {
            return false;
        }

        let current_stake = self.stakes.get(operator);
        if current_stake < amount {
            return false;
        }

        self.used_proofs.insert(proof_hash, true);
        self.stakes.insert(operator, current_stake - amount);
        let next_beneficiary_balance = self.beneficiary_balances.get(beneficiary) + amount;
        self.beneficiary_balances
            .insert(beneficiary, next_beneficiary_balance);
        true
    }
}
