# DealFlow Python — 100 scenario results

**100 of 100 passed.** Same file as local, the attached zip, and GitHub `python/dealflow_graph.py`.

| # | Scenario | Discount | Payment | Expected | Actual | Result |
|---|---|---|---|---|---|---|
| 1 | Northwind clean 88/90 | Approve 88 | Approve 90 | Approve 89 R3 | Approve 89 R3 | PASS |
| 2 | Harbor stricter 88/32 | Approve 88 | Escalate 32 | Escalate 32 R2 | Escalate 32 R2 | PASS |
| 3 | Pinnacle reject | Reject 13 | Approve 90 | Reject 13 R1 | Reject 13 R1 | PASS |
| 4 | Kite both reject + note | Reject 16 | Reject 20 | Reject 16 R1 | Reject 16 R1 | PASS |
| 5 | Both escalate Vanta | Escalate 40 | Escalate 35 | Escalate 35 R2 | Escalate 35 R2 | PASS |
| 6 | Threshold exact 75 | Approve 75 | Approve 75 | Approve 75 R3 | Approve 75 R3 | PASS |
| 7 | Threshold under 74 | Approve 74 | Approve 74 | Escalate 74 R4 | Escalate 74 R4 | PASS |
| 8 | Avg just under 80/69 | Approve 80 | Approve 69 | Escalate 74 R4 | Escalate 74 R4 | PASS |
| 9 | Avg just over 80/70 | Approve 80 | Approve 70 | Approve 75 R3 | Approve 75 R3 | PASS |
| 10 | Matrix Approve/Escalate | Approve 60 | Escalate 55 | Escalate 55 R2 | Escalate 55 R2 | PASS |
| 11 | Matrix Approve/Reject | Approve 60 | Reject 55 | Reject 55 R1 | Reject 55 R1 | PASS |
| 12 | Matrix Escalate/Approve | Escalate 60 | Approve 55 | Escalate 55 R2 | Escalate 55 R2 | PASS |
| 13 | Matrix Escalate/Escalate | Escalate 60 | Escalate 55 | Escalate 55 R2 | Escalate 55 R2 | PASS |
| 14 | Matrix Escalate/Reject | Escalate 60 | Reject 55 | Reject 55 R1 | Reject 55 R1 | PASS |
| 15 | Matrix Reject/Approve | Reject 60 | Approve 55 | Reject 55 R1 | Reject 55 R1 | PASS |
| 16 | Matrix Reject/Escalate | Reject 60 | Escalate 55 | Reject 55 R1 | Reject 55 R1 | PASS |
| 17 | Matrix Reject/Reject | Reject 60 | Reject 55 | Reject 55 R1 | Reject 55 R1 | PASS |
| 18 | Threshold 50 both 80 | Approve 80 | Approve 80 | Approve 80 R3 | Approve 80 R3 | PASS |
| 19 | Threshold 60 both 80 | Approve 80 | Approve 80 | Approve 80 R3 | Approve 80 R3 | PASS |
| 20 | Threshold 70 both 80 | Approve 80 | Approve 80 | Approve 80 R3 | Approve 80 R3 | PASS |
| 21 | Threshold 75 both 80 | Approve 80 | Approve 80 | Approve 80 R3 | Approve 80 R3 | PASS |
| 22 | Threshold 80 both 80 | Approve 80 | Approve 80 | Approve 80 R3 | Approve 80 R3 | PASS |
| 23 | Threshold 85 both 80 | Approve 80 | Approve 80 | Escalate 80 R4 | Escalate 80 R4 | PASS |
| 24 | Threshold 90 both 80 | Approve 80 | Approve 80 | Escalate 80 R4 | Escalate 80 R4 | PASS |
| 25 | Threshold 95 both 80 | Approve 80 | Approve 80 | Escalate 80 R4 | Escalate 80 R4 | PASS |
| 26 | Reject off both reject | Reject 20 | Reject 10 | Escalate 10 R1b | Escalate 10 R1b | PASS |
| 27 | Reject off one reject | Reject 40 | Approve 90 | Escalate 40 R1b | Escalate 40 R1b | PASS |
| 28 | Reject on still reject | Reject 40 | Approve 90 | Reject 40 R1 | Reject 40 R1 | PASS |
| 29 | Reject off conf 10 vs 90 | Reject 10 | Approve 90 | Escalate 10 R1b | Escalate 10 R1b | PASS |
| 30 | Reject off conf 25 vs 90 | Reject 25 | Approve 90 | Escalate 25 R1b | Escalate 25 R1b | PASS |
| 31 | Reject off conf 50 vs 90 | Reject 50 | Approve 90 | Escalate 50 R1b | Escalate 50 R1b | PASS |
| 32 | Reject off conf 75 vs 90 | Reject 75 | Approve 90 | Escalate 75 R1b | Escalate 75 R1b | PASS |
| 33 | Reject off conf 99 vs 90 | Reject 99 | Approve 90 | Escalate 90 R1b | Escalate 90 R1b | PASS |
| 34 | Note on clean approve | Approve 88 | Approve 90 | Escalate 74 G-OUT | Escalate 74 G-OUT | PASS |
| 35 | Note on already escalate | Escalate 40 | Approve 90 | Escalate 40 R2 | Escalate 40 R2 | PASS |
| 36 | Note on already reject | Reject 16 | Approve 90 | Reject 16 R1 | Reject 16 R1 | PASS |
| 37 | Empty note is not an attack | Approve 88 | Approve 90 | Approve 89 R3 | Approve 89 R3 | PASS |
| 38 | Note thr 60 | Approve 95 | Approve 95 | Escalate 59 G-OUT | Escalate 59 G-OUT | PASS |
| 39 | Note thr 75 | Approve 95 | Approve 95 | Escalate 74 G-OUT | Escalate 74 G-OUT | PASS |
| 40 | Note thr 90 | Approve 95 | Approve 95 | Escalate 89 G-OUT | Escalate 89 G-OUT | PASS |
| 41 | No citation both approve | Approve 90 | Approve 90 | Escalate 90 G-OUT | Escalate 90 G-OUT | PASS |
| 42 | No citation escalate | Escalate 40 | Approve 90 | Escalate 40 G-OUT | Escalate 40 G-OUT | PASS |
| 43 | No citation reject | Reject 10 | Approve 90 | Escalate 10 G-OUT | Escalate 10 G-OUT | PASS |
| 44 | Citation only discount | Approve 90 | Approve 90 | Approve 90 R3 | Approve 90 R3 | PASS |
| 45 | Citation only payment | Approve 90 | Approve 90 | Approve 90 R3 | Approve 90 R3 | PASS |
| 46 | Conf 0/0 | Approve 0 | Approve 0 | Escalate 0 R4 | Escalate 0 R4 | PASS |
| 47 | Conf 0/100 | Approve 0 | Approve 100 | Escalate 50 R4 | Escalate 50 R4 | PASS |
| 48 | Conf 1/99 | Approve 1 | Approve 99 | Escalate 50 R4 | Escalate 50 R4 | PASS |
| 49 | Conf 49/49 | Approve 49 | Approve 49 | Escalate 49 R4 | Escalate 49 R4 | PASS |
| 50 | Conf 50/50 | Approve 50 | Approve 50 | Escalate 50 R4 | Escalate 50 R4 | PASS |
| 51 | Conf 99/99 | Approve 99 | Approve 99 | Approve 99 R3 | Approve 99 R3 | PASS |
| 52 | Conf 100/100 | Approve 100 | Approve 100 | Approve 100 R3 | Approve 100 R3 | PASS |
| 53 | Conf 88/90 | Approve 88 | Approve 90 | Approve 89 R3 | Approve 89 R3 | PASS |
| 54 | Conf 13/90 | Approve 13 | Approve 90 | Escalate 51 R4 | Escalate 51 R4 | PASS |
| 55 | Conf 32/88 | Approve 32 | Approve 88 | Escalate 60 R4 | Escalate 60 R4 | PASS |
| 56 | Escalate lower wins | Approve 90 | Escalate 12 | Escalate 12 R2 | Escalate 12 R2 | PASS |
| 57 | Reject lower wins | Reject 8 | Escalate 70 | Reject 8 R1 | Reject 8 R1 | PASS |
| 58 | Escalate higher min is payment | Escalate 20 | Approve 99 | Escalate 20 R2 | Escalate 20 R2 | PASS |
| 59 | Marlow Net-60 | Approve 50 | Escalate 45 | Escalate 45 R2 | Escalate 45 R2 | PASS |
| 60 | Harbor payment fails again | Approve 88 | Escalate 32 | Escalate 32 R2 | Escalate 32 R2 | PASS |
| 61 | Vanta both fail | Reject 22 | Reject 18 | Reject 18 R1 | Reject 18 R1 | PASS |
| 62 | Sable prepay threshold | Approve 70 | Approve 72 | Escalate 71 R4 | Escalate 71 R4 | PASS |
| 63 | Cited truncated still cites | Approve 88 | Approve 90 | Approve 89 R3 | Approve 89 R3 | PASS |
| 64 | Segment mid-market | Approve 88 | Escalate 32 | Escalate 32 R2 | Escalate 32 R2 | PASS |
| 65 | New logo | Reject 16 | Reject 20 | Reject 16 R1 | Reject 16 R1 | PASS |
| 66 | Expansion | Reject 13 | Approve 80 | Reject 13 R1 | Reject 13 R1 | PASS |
| 67 | Pad 1 thr 51 | Approve 51 | Approve 51 | Approve 51 R3 | Approve 51 R3 | PASS |
| 68 | Pad 2 thr 52 | Approve 52 | Approve 52 | Approve 52 R3 | Approve 52 R3 | PASS |
| 69 | Pad 3 thr 53 | Approve 53 | Approve 53 | Approve 53 R3 | Approve 53 R3 | PASS |
| 70 | Pad 4 thr 54 | Approve 54 | Approve 54 | Approve 54 R3 | Approve 54 R3 | PASS |
| 71 | Pad 5 thr 55 | Approve 55 | Approve 55 | Approve 55 R3 | Approve 55 R3 | PASS |
| 72 | Pad 6 thr 56 | Approve 56 | Approve 56 | Approve 56 R3 | Approve 56 R3 | PASS |
| 73 | Pad 7 thr 57 | Approve 57 | Approve 57 | Approve 57 R3 | Approve 57 R3 | PASS |
| 74 | Pad 8 thr 58 | Approve 58 | Approve 58 | Approve 58 R3 | Approve 58 R3 | PASS |
| 75 | Pad 9 thr 59 | Approve 59 | Approve 59 | Approve 59 R3 | Approve 59 R3 | PASS |
| 76 | Pad 10 thr 60 | Approve 60 | Approve 60 | Approve 60 R3 | Approve 60 R3 | PASS |
| 77 | Pad 11 thr 61 | Approve 61 | Approve 61 | Approve 61 R3 | Approve 61 R3 | PASS |
| 78 | Pad 12 thr 62 | Approve 62 | Approve 62 | Approve 62 R3 | Approve 62 R3 | PASS |
| 79 | Pad 13 thr 63 | Approve 63 | Approve 63 | Approve 63 R3 | Approve 63 R3 | PASS |
| 80 | Pad 14 thr 64 | Approve 64 | Approve 64 | Approve 64 R3 | Approve 64 R3 | PASS |
| 81 | Pad 15 thr 65 | Approve 65 | Approve 65 | Approve 65 R3 | Approve 65 R3 | PASS |
| 82 | Pad 16 thr 66 | Approve 66 | Approve 66 | Approve 66 R3 | Approve 66 R3 | PASS |
| 83 | Pad 17 thr 67 | Approve 67 | Approve 67 | Approve 67 R3 | Approve 67 R3 | PASS |
| 84 | Pad 18 thr 68 | Approve 68 | Approve 68 | Approve 68 R3 | Approve 68 R3 | PASS |
| 85 | Pad 19 thr 69 | Approve 69 | Approve 69 | Approve 69 R3 | Approve 69 R3 | PASS |
| 86 | Pad 20 thr 70 | Approve 70 | Approve 70 | Approve 70 R3 | Approve 70 R3 | PASS |
| 87 | Pad 21 thr 71 | Approve 71 | Approve 71 | Approve 71 R3 | Approve 71 R3 | PASS |
| 88 | Pad 22 thr 72 | Approve 72 | Approve 72 | Approve 72 R3 | Approve 72 R3 | PASS |
| 89 | Pad 23 thr 73 | Approve 73 | Approve 73 | Approve 73 R3 | Approve 73 R3 | PASS |
| 90 | Pad 24 thr 74 | Approve 74 | Approve 74 | Approve 74 R3 | Approve 74 R3 | PASS |
| 91 | Pad 25 thr 75 | Approve 75 | Approve 75 | Approve 75 R3 | Approve 75 R3 | PASS |
| 92 | Pad 26 thr 76 | Approve 76 | Approve 76 | Approve 76 R3 | Approve 76 R3 | PASS |
| 93 | Pad 27 thr 77 | Approve 77 | Approve 77 | Approve 77 R3 | Approve 77 R3 | PASS |
| 94 | Pad 28 thr 78 | Approve 78 | Approve 78 | Approve 78 R3 | Approve 78 R3 | PASS |
| 95 | Pad 29 thr 79 | Approve 79 | Approve 79 | Approve 79 R3 | Approve 79 R3 | PASS |
| 96 | Pad 30 thr 80 | Approve 80 | Approve 80 | Approve 80 R3 | Approve 80 R3 | PASS |
| 97 | Pad 31 thr 81 | Approve 81 | Approve 81 | Approve 81 R3 | Approve 81 R3 | PASS |
| 98 | Pad 32 thr 82 | Approve 82 | Approve 82 | Approve 82 R3 | Approve 82 R3 | PASS |
| 99 | Pad 33 thr 83 | Approve 83 | Approve 83 | Approve 83 R3 | Approve 83 R3 | PASS |
| 100 | Pad 34 thr 84 | Approve 84 | Approve 84 | Approve 84 R3 | Approve 84 R3 | PASS |

Node order on every pass: orchestrator_plan → discount_agent ∥ payment_agent → orchestrator_combine → guardrail.