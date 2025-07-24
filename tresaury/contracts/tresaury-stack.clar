;; TreasuryStack - Multi-Signature Wallet for DAOs

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-unauthorized (err u100))
(define-constant err-invalid-threshold (err u101))
(define-constant err-member-exists (err u102))
(define-constant err-member-not-found (err u103))
(define-constant err-proposal-not-found (err u104))
(define-constant err-already-voted (err u105))
(define-constant err-proposal-expired (err u106))
(define-constant err-insufficient-votes (err u107))
(define-constant err-invalid-amount (err u108))
(define-constant err-execution-failed (err u109))

;; Role definitions
(define-constant ROLE-ADMIN u1)
(define-constant ROLE-SIGNER u2)
(define-constant ROLE-VIEWER u3)

;; Data variables
(define-data-var signature-threshold uint u3)
(define-data-var total-members uint u0)
(define-data-var proposal-counter uint u0)
(define-data-var treasury-balance uint u0)
(define-data-var vault-paused bool false)

;; Organization members with roles
(define-map organization-members
    principal
    {
        role: uint,
        added-at: uint,
        last-activity: uint,
        active: bool,
    }
)

;; Multi-signature proposals
(define-map proposals
    uint
    {
        proposer: principal,
        proposal-type: (string-utf8 32),
        recipient: principal,
        amount: uint,
        description: (string-utf8 256),
        votes-for: uint,
        votes-against: uint,
        executed: bool,
        created-at: uint,
        expiry: uint,
        threshold-required: uint,
    }
)

;; Proposal voting records
(define-map proposal-votes
    {
        proposal-id: uint,
        voter: principal,
    }
    {
        vote: bool, ;; true = approve, false = reject
        voted-at: uint,
    }
)

;; Member list for iteration
(define-map member-list
    uint
    principal
)
