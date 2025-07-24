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

;; Read-only functions
(define-read-only (get-member-info (member principal))
    (map-get? organization-members member)
)

(define-read-only (get-proposal (proposal-id uint))
    (map-get? proposals proposal-id)
)

(define-read-only (get-vote
        (proposal-id uint)
        (voter principal)
    )
    (map-get? proposal-votes {
        proposal-id: proposal-id,
        voter: voter,
    })
)

(define-read-only (get-signature-threshold)
    (var-get signature-threshold)
)

(define-read-only (get-treasury-balance)
    (var-get treasury-balance)
)

(define-read-only (get-vault-stats)
    (ok {
        total-members: (var-get total-members),
        signature-threshold: (var-get signature-threshold),
        treasury-balance: (var-get treasury-balance),
        total-proposals: (var-get proposal-counter),
        vault-paused: (var-get vault-paused),
    })
)

(define-read-only (is-authorized-member (member principal))
    (match (map-get? organization-members member)
        member-info (and (get active member-info) (>= (get role member-info) ROLE-SIGNER))
        false
    )
)

;; Private functions
(define-private (has-role
        (member principal)
        (required-role uint)
    )
    (match (map-get? organization-members member)
        member-info (and
            (get active member-info)
            (>= (get role member-info) required-role)
        )
        false
    )
)

(define-private (calculate-votes-needed)
    (var-get signature-threshold)
)

;; Member management
(define-public (add-member
        (new-member principal)
        (role uint)
    )
    (begin
        (asserts! (has-role tx-sender ROLE-ADMIN) err-unauthorized)
        (asserts! (not (var-get vault-paused)) err-unauthorized)
        (asserts! (is-none (map-get? organization-members new-member))
            err-member-exists
        )
        (asserts! (and (>= role ROLE-VIEWER) (<= role ROLE-ADMIN))
            err-invalid-threshold
        )
        (map-set organization-members new-member {
            role: role,
            added-at: stacks-block-height,
            last-activity: stacks-block-height,
            active: true,
        })
        ;; Add to member list
        (let ((member-index (var-get total-members)))
            (map-set member-list member-index new-member)
            (var-set total-members (+ member-index u1))
        )
        (ok true)
    )
)

(define-public (remove-member (member principal))
    (let ((member-info (unwrap! (map-get? organization-members member) err-member-not-found)))
        (begin
            (asserts! (has-role tx-sender ROLE-ADMIN) err-unauthorized)
            (asserts! (not (var-get vault-paused)) err-unauthorized)
            (asserts! (get active member-info) err-member-not-found)
            (map-set organization-members member
                (merge member-info { active: false })
            )
            (ok true)
        )
    )
)

(define-public (update-member-role
        (member principal)
        (new-role uint)
    )
    (let ((member-info (unwrap! (map-get? organization-members member) err-member-not-found)))
        (begin
            (asserts! (has-role tx-sender ROLE-ADMIN) err-unauthorized)
            (asserts! (not (var-get vault-paused)) err-unauthorized)
            (asserts! (get active member-info) err-member-not-found)
            (asserts! (and (>= new-role ROLE-VIEWER) (<= new-role ROLE-ADMIN))
                err-invalid-threshold
            )
            (map-set organization-members member
                (merge member-info {
                    role: new-role,
                    last-activity: stacks-block-height,
                })
            )
            (ok true)
        )
    )
)
