# Decisions

Garnet keeps a strict line between what has been decided and what has not (§15: _"recommendations are not silently treated as approved decisions"_). Every rule in code or docs that depends on a choice names its decision ID.

## Where things live

| What                                                           | Where                                                                              |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Register of every decision, proposal and open question         | [decision-log.md](./decision-log.md)                                               |
| Architecture Decision Records (context, options, consequences) | [adr/](./adr/)                                                                     |
| The original scope record                                      | [../phase-1-scope-and-decision-record.md](../phase-1-scope-and-decision-record.md) |

## ID scheme

| Prefix     | Meaning                                                                | Example  |
| ---------- | ---------------------------------------------------------------------- | -------- |
| `D-xx`     | Decision from the Phase 1 scope record appendix (numbering preserved). | D-14     |
| `P-xx`     | Proposal introduced during Phase 1 work. **Needs owner review.**       | P-05     |
| `U-xx`     | Unresolved question. **Blocks dependent implementation.**              | U-02     |
| `ADR-NNNN` | Architecture decision record explaining a D or P in depth.             | ADR-0003 |

## Status vocabulary

| Status                | Meaning                                                                                                                                                                                                                                            | May code depend on it?                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Accepted**          | Signed off by the product owner.                                                                                                                                                                                                                   | Yes.                                                                                  |
| **Planning baseline** | Endorsed by the owner as the **working direction for Phase 2 planning**. Not Accepted. Does not accept the specific product or security policies inside it, and does not mean any implementation has been verified. Unspecified details stay open. | Yes, for planning and foundation work, citing the ID. Verification is still required. |
| **Proposed**          | In the scope record as a proposed decision, awaiting final sign-off.                                                                                                                                                                               | Yes, but keep it easy to change; cite the ID.                                         |
| **Recommended**       | Explicitly a recommendation, _not_ approved.                                                                                                                                                                                                       | Only behind an explicit option; never as a silent default.                            |
| **Phase 1 proposal**  | Added by Phase 1 work to fill a gap. Rationale recorded.                                                                                                                                                                                           | Only in spikes and drafts until reviewed.                                             |
| **Unresolved**        | Open. Candidate options may be listed.                                                                                                                                                                                                             | No. Model it as a required parameter with no default.                                 |
| **Superseded**        | Replaced; link to the replacement.                                                                                                                                                                                                                 | No.                                                                                   |

At the end of Phase 1 nothing is **Accepted** yet: the scope record itself calls its decisions "proposed". The owner signs off by changing the status in [decision-log.md](./decision-log.md) and adding the date.

### Owner directions

When the owner states an intended direction without accepting it, it is logged as a **Phase 1 proposal** with the source "**Owner direction**" and a date. Owner directions are documented intent, not Accepted decisions and not verified behaviour. Documents must not contradict them, and the questions they leave open stay **Unresolved**.

### Evidence is separate from status

No status implies verification. Evidence levels are stated separately: _domain_ (Node tests), _simulation_ (F-04), _database_ (F-05, PGlite), _app/OS/device_ (none yet). See the [status board](../README.md#phase-1-status-board).

## How to change a decision

1. Edit the row in [decision-log.md](./decision-log.md): status, date, and a one-line rationale.
2. If it has architectural consequences, add or update an ADR from [adr/template.md](./adr/template.md).
3. Update code that names the ID (`grep -r "U-02"`) and the docs that cite it.
4. Never delete history: mark rows **Superseded** and link forward.

## How unresolved items appear in code

- No default values. The engine takes the choice as a required parameter: see `SparkPolicy.graceCooldownDays` (U-03) and `SparkPolicy.whenGraceUnavailable` (U-04) in [`packages/domain/src/spark/spark.ts`](../../packages/domain/src/spark/spark.ts).
- Candidate options are exported as named constants, such as `GRACE_COOLDOWN_OPTIONS`, so decision-makers can compare behaviour in tests.
- Tests that depend on an unresolved choice name the option they assume.
