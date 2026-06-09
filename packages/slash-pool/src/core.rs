use std::collections::HashMap;

pub type Address = [u8; 20];
pub type ProofHash = [u8; 32];

#[derive(Debug, PartialEq, Eq)]
pub enum SlashError {
    DuplicateProof,
    InsufficientStake,
    InvalidAmount,
    InvalidBeneficiary,
}

#[derive(Debug, PartialEq, Eq)]
pub struct SlashReceipt {
    pub remaining_stake: u128,
    pub beneficiary_balance: u128,
}

#[derive(Default)]
pub struct SlashPoolCore {
    stakes: HashMap<Address, u128>,
    beneficiary_balances: HashMap<Address, u128>,
    used_proofs: HashMap<ProofHash, bool>,
}

impl SlashPoolCore {
    pub fn deposit(&mut self, operator: Address, amount: u128) -> Result<u128, SlashError> {
        if amount == 0 {
            return Err(SlashError::InvalidAmount);
        }

        let next_stake = self.stake_of(operator) + amount;
        self.stakes.insert(operator, next_stake);
        Ok(next_stake)
    }

    pub fn submit_violation(
        &mut self,
        operator: Address,
        beneficiary: Address,
        amount: u128,
        proof_hash: ProofHash,
    ) -> Result<SlashReceipt, SlashError> {
        if amount == 0 {
            return Err(SlashError::InvalidAmount);
        }
        if beneficiary == [0; 20] {
            return Err(SlashError::InvalidBeneficiary);
        }
        if self.proof_used(proof_hash) {
            return Err(SlashError::DuplicateProof);
        }

        let current_stake = self.stake_of(operator);
        if current_stake < amount {
            return Err(SlashError::InsufficientStake);
        }

        let remaining_stake = current_stake - amount;
        let beneficiary_balance = self.beneficiary_balance_of(beneficiary) + amount;
        self.used_proofs.insert(proof_hash, true);
        self.stakes.insert(operator, remaining_stake);
        self.beneficiary_balances
            .insert(beneficiary, beneficiary_balance);

        Ok(SlashReceipt {
            remaining_stake,
            beneficiary_balance,
        })
    }

    pub fn stake_of(&self, operator: Address) -> u128 {
        self.stakes.get(&operator).copied().unwrap_or_default()
    }

    pub fn beneficiary_balance_of(&self, beneficiary: Address) -> u128 {
        self.beneficiary_balances
            .get(&beneficiary)
            .copied()
            .unwrap_or_default()
    }

    pub fn proof_used(&self, proof_hash: ProofHash) -> bool {
        self.used_proofs
            .get(&proof_hash)
            .copied()
            .unwrap_or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const OPERATOR: Address = [1; 20];
    const BENEFICIARY: Address = [3; 20];
    const PROOF: ProofHash = [2; 32];

    #[test]
    fn slash_reduces_stake_once() {
        let mut pool = SlashPoolCore::default();

        assert_eq!(pool.deposit(OPERATOR, 100), Ok(100));

        let receipt = pool
            .submit_violation(OPERATOR, BENEFICIARY, 25, PROOF)
            .unwrap();
        assert_eq!(
            receipt,
            SlashReceipt {
                remaining_stake: 75,
                beneficiary_balance: 25
            }
        );
        assert_eq!(pool.stake_of(OPERATOR), 75);
        assert_eq!(pool.beneficiary_balance_of(BENEFICIARY), 25);
        assert!(pool.proof_used(PROOF));
        assert_eq!(
            pool.submit_violation(OPERATOR, BENEFICIARY, 25, PROOF),
            Err(SlashError::DuplicateProof)
        );
    }

    #[test]
    fn cannot_slash_more_than_stake() {
        let mut pool = SlashPoolCore::default();

        assert_eq!(pool.deposit(OPERATOR, 10), Ok(10));
        assert_eq!(
            pool.submit_violation(OPERATOR, BENEFICIARY, 25, PROOF),
            Err(SlashError::InsufficientStake)
        );
        assert_eq!(pool.stake_of(OPERATOR), 10);
        assert!(!pool.proof_used(PROOF));
    }

    #[test]
    fn rejects_zero_deposit_and_zero_slash() {
        let mut pool = SlashPoolCore::default();

        assert_eq!(pool.deposit(OPERATOR, 0), Err(SlashError::InvalidAmount));
        assert_eq!(
            pool.submit_violation(OPERATOR, BENEFICIARY, 0, PROOF),
            Err(SlashError::InvalidAmount)
        );
    }

    #[test]
    fn rejects_zero_beneficiary() {
        let mut pool = SlashPoolCore::default();

        assert_eq!(pool.deposit(OPERATOR, 100), Ok(100));
        assert_eq!(
            pool.submit_violation(OPERATOR, [0; 20], 25, PROOF),
            Err(SlashError::InvalidBeneficiary)
        );
        assert_eq!(pool.stake_of(OPERATOR), 100);
        assert!(!pool.proof_used(PROOF));
    }
}
