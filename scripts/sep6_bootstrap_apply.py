#!/usr/bin/env python3
from __future__ import annotations

import base64
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CUTOFF = "2026-09-06T14:10:43-04:00"
PACKET_PATH = ROOT / "data/canonical-updates/UPD-20260906-CURRENT.json"
PACKET_GZIP_B64 = "H4sIAI2ynWoC/+19aXPiSrL29/dXKDpuRH94LYN3u/1JgGxrGgPD0n08NyaIQipAx0JitNhNT8x/v5lZiyQQNqbbc5aZiBt3TmNJpcrKPZ9M/fND4s75go2feJz4Ufjh04fjw/qHgw9L5j7ydOx78Muo1zKP68fn9av6udkc9ft2ZwiXPIbRczhmKd4DfzXrV2b9fHh0+umo/un0xKyffqrjk/iT7/HQ5WM3S6Pp9JWrk2yxYPEKrhrw5aFxZp4b0ywIzMSNltxQzzL80I35gofpJyPmIX/mnjE6HByaTsxCAx7gp/6CG49+yFPfTQ4MN1oseOz6LDBSFj7y2AiiJOHwl7soXmTfa9yNwmjhu0aSspQfGJ6/DKIFc1cHsEAAP3lGOufwvzE+LWD+wmDer5nnuywFuhks9ODCNI6Ym/pP3Lj3QzYxWJrG/iSjK9wojqNJFNP1h7jVKItdnnz49L//lP8tyD3oN81zq37cODppXF0dt+DSKEsDjoTGTRpN2HcMO2nCpmBd+Hvqw9/hz004mWb33mjxBF5llRgnhtO/bRpdPzCGtO/EsKawCYMINWTxjKeJcUzEMzrsaWV8ZXEy95cJPDWLA3jmPE2Xyada7fn5+dCFlYGUhws/qN3bLceq9UaNttM0+3bbtgb2oGbFQPCA107Pro4uTk9r8g7Tk29knph+PHPNyA9McRKJyfCN4GcWwk/0RuaxmSVmCO9jPsv3qSFTZpPAT+bcG3twEkVOOtP0HMcRkaLXd+6t/sO4e3PjNB2r/eFfB5tktuuXN63j02bz8uaySOY+z/CkC5QdDQzYtA/vtwIWif1HngBDxJwTJX0gphtnHjdgX4bL4tgnRlk7KSNhq2rCxmLBQyBV7TmKA6+28D0v4CZnSVoDWqjFTbm4SYsT0WBxkxYnoqrFTVesbbpibRPXNnOCvZWeTqdl92z4f53h+KvTtyvp2TptnTfqtnVRvzh9jZ4HmnLTCOXAmPoxB4kxnjhIZpCAjBvPJHBGyJng2D1ox7+BIKNqS0yQ39gz8WFEt8R8nAO7mX4SIH1mWTA1o9if+aGZhaTczCkwH9zwnPxbqHdzdlI/Pzs7BgKWuNFKkghUF+qgXgzEKZCRxJjUUWIwyZgGqiMDGBblBqkIissYAC/4qRFNpcIzQCvRH+A6UKk+0N9PN8jLlrh5oiyTgs3OjiecuxcXnntVZ9MTr35a9+pnZyeXJxfMO66/SJjz/QjTPDmtNy7OLs4uT45fZiukx8dE7THgYNbYjAMfhbBBluBuc03/j4zz79yY+Cl/XSonWQLWJElqYG7i2aomOGhOC5lqIZMWQt2lVjHlKiatknPQee09CGUfH59fWaeN06ur1uuEMtIIrKH7GPCcKH6SZGgWkd/B8sbAIjGaMbgsMZ79IDAm3Pi4iEBUl8wPwTZ/3EMopa7HpXNKiaWFpMmVTbmyiSubE27iwqZc+L2JedI4v2g1zq3m6eXJy8Ts9uzm/zceOV8mZADg0iWI1zIKfHdlZKE7Z+EMpBcUndF102jC4zfzG7g/wEw8NXEZ0vRiFVOsYupVzCQLPQaGQrgXSM/3plT9+PSmdXTSsuE5r7BdEjMe+NqEPiJHJSA9ISoqeC6eemi0+YSF0T7q3hcLFOwlspOfarup1gCZpTWk9zHn3ydRELC5GTAkJdDx3dnrslm/aV1dnFo3JW0fGH9h3znoE6NmWDc9/P8h86IgK9DxAZ1fX1lO4Y/CDuHNZiDEno+7dVODAWmAsCkPE3/qAwfe4e59vAG2Uq30WPCrWJ4ojPq/hlutXdXOayta1hTLmrSsqZc11bImLmsWlgU1icua+bJvoWbfvnW6HasNpBzebafn+Wn9pFk/so6ubHtH6zmc5+4bxEFRFCARM/dRWU1wPsGagMMQgIFMtR70wSWJnsHILjgoJAwqULLduR94EI3sYkVP6idgRPnJ5bk3PZ9enPPJKT8+n1xNj6fTkynjP8BwfbvZ7QyG/VFzCGSrJNXR0XHdspuNkxPrbEdSoZsANOCBsYQjBp6bgzfBIOSBsMaDf8zm6Fv8z9nh5Rn5H9LwsoToSNYGiImcGWfLVPw6DYCIcNc040ElK3oZ3DeLQFxZ4BXpl9SYflVzia+KPrJ4QVO8oAkvaDJTvKCJL2hGU/PMvDwzUeilvWboSAs3GiMNU70f/Yrvhzfh+72sAk73UwGnF3bj9KxRb7Ss5isWBqwKDz0wwZw/ErnBLAOddfA7EKGv1HIH6rCACIk8pLdbHLAxaHCSFCwOsL+Jawcrcwbm14RLXTDHIOe/ZvBb9IQRnJT4lR/O0AcSVh5/Qu87J9a70LJ1Zl0cX5xfnF7ZR6WIedBxjA7IX5GZIdo9kCFwzDzyjskcgdhvOMrAwo0onRsNkP6AnOtBRImEe+75bIOqJOpZEvqHUTwTmrN+VYNNZ6aiCC6p7RHSkpZETpPuJHDlBJY0J7Qk8isxe2Au5JJvCT0G4JxA/OsMhuOWfWN3Bva4Y38dVBLx8ua0cXJ5eXlz0ii5PEQqB443Dil9Abt3/RSOWWYVgIruo+SjstKQ2RalOXUkB2o1gd1ydCoh/jCmcbQAu5c8olOKTIt+FAZsaSBSHJu8S7FvmAbEvDysyRTV2elV/eiNNNImpukMnc7tuECz7sDpDCuJdXzRalnH50dnV/WSsy2ttWHNeOiuiuYmix/hjUqBL/dnobHwQzCdGOmC/nGzBHYPag/Jm7KA/G7gv9Gg2lyTnT5MYyRBiiusuPjfZK7TA3IhUy9kyoVMuZBJC5m4EEhu7bR+enl6frEvFbfy11X9+OLi5PS8bh2VArkByzzfuAW/I015gWLi95t7RReOymwmGNADrzGIlpgERH0H/l/iskBk40CO4b8DSTlJ7gOjx4AqwJHgAEUZcvMS+GvTC0pw1Zl4GSJuwrThPj8/PTm5EJeYLGYTn8l/TBemfktTvaVZfEuz9JIo+fSSgurqqJbqHc21d9zLZRIn8XfMwuIbUK6R/lOcye2JiflBE8zHV6s/uHN6A5XpPfsgb6o8ePEXTLKOwfy6vswdt6yhPe522g+lTC5pD+VWGxPYM+wQ3NQFRHx+gIm0CGyvh0kLTEMyP3Zj8MpVHo1yq8yYZaAoPFPeZMiEIo8PDZX1TBh4u6g4DZU0NPgT6FpK3ear4ePCSKy1BFmIwhAs5TOHkHbOYlCx13lOT2RWwBgkmQtORQJhp+GxBeUU8IYwSg14ESaPBtNXuJZIdR/mhFotyZD1rc64YbVRsTjN8b0zGDhte2wNh1bzM9BtPBqM1Tnoe9FpTjC32+3b+Nehc2+P7S8iB6+T6yDhi4qsp/CZNwyoSN4H3JvxwvM7Q/u+14V3tLukbISJGhMfwg5hB+Acc8mJ7pg9MT/A34kPShwyrNc/0f/pvP6MAavki+5wh9YdyLVVSfGKBO5GDhI4v5imH8N5kSamNDMqWHDlk2y5jGLwJA+NwcYpk6tfOuNrg0EIH6sLJIvEfMEwguUgriAv4CVHyyjxcdHkkHRhWezQYQNKm0Or89num+CvO5/t9xA+YnMZJ8rgRuStdcpY2mjwfoCVUhEnTlZaqsD/aUXP4eoAXCMWPxpHJECfV0FU60TfeLgmf3QtXaIuJ0EBQVuwEJ4frFCZI9t4aw8CqUU6hh5cj1FrBPfgdQZF6OQUuDF/psvSKPDQU2AQw3ug8FHaN8QNpEnSFWWLhK/tALlbY3jbe7tPAiIO4L/itre4Ff3ubeIGKlEwncrtM2CJmKcgMsgGSaE+V0vm4D49Q/DFOUSYcDmad5RBXX9ZggHFA4Df2SSBQ8vrglpOUbZ1DkjdQMW9rFIeyQwOnF/ML/ZgYLfNZtty7t9BHCnlgCU50huw+YJhUU5yFEpqKcHEwGxmZCHLUvCZ/e9wWwy+k7Rl4loqfwY+3OApKh8auFrifzPFD2otmS9COUK6+iBxSxQ7Ek43Cqc+WsFXbdktWDCr75CADEbNJhBuTGTbkKXBEGkx6Fi9wV23So6s5rDbFzeP+zYIxRCEtPHw8yRpyoLkNxSltbrYRqp+i9w06ZyiMFgdgl6lwwINiOYFDpUq2DK2T0T8RMcl+Yo2X8XpN04L7I7Vt27vmneO2QR35D34XEQgxo0Mce5l5GHcsUdwrG58j4miuXK1Ni60JhNgUCtms7k793UEIJw5FR/lRX8KYA4wqHymwGnOMD8ly/jobWJ6HB09YamRv0Wl3stivEFlUjbAAxuc33J67e69hR4cEm+D2wt/B6buddtO82GrBSl56pL3/6hcXgqIt7B0X/IrqBlQdqnQ7MwI+SxKReYRFD4EfxgwGZhUjUJUWQSZ2KK1wZUade6tTsduVWrv861cfb5XJENujp8qbwp+ycIF8pbAoEjti9qcL5bkZIKjwjGUq6zEXosyLN6pLRxVZD3JxK4QZVLmYCeXwnEVh6zcT/KxPB82IHU4Jpl89FNX0kaANeHuPITjoPoUPIhvsQC7xzPEkwPU1eoAMIIRZyBdr30tQrfX6w7geQXLMPhtTcP5m4XmfBehKRX9twiNJdgDuQITHxEXxwZOOjjFPJjmR2bg2yB76BQT7m4eRRC2bJ6/UIXgX4QxT6LgCUKgCiH7q9V2GtaNaQ9A3VlYVDBb3Sacbsd+BxHrYbGFkfgPlpxh8vA+mjP4s2c02D/gn39lgT9hUyGHsrKQYHYc9w3/wsoZSBdFYDFlK1PcarKEUEy7TMDY0yzNpBsKK1Le6DnKIK6YcCAb2qADzEA+qRREsehdHdrnFBorCo0Hzi2o9z0EQIUUAmE1phvuRYHnzycFu3hDLQ4bguAadZoXubCFkGPIDiHAPzIyFxgwyvT0hM/h5MCA+KLWhO5D7C/8EO+v4vK7bv9+9Dez0e42P1stGwLzdvvhHfhbBssfwQRmiwxTgeCDTILIfcRCBLAiaGARCIukBEZHV8dFAKOKoSBKJoXPvQMZA5QC6/Q5MiYRiz2U6jVuFZsdq82Om6P7ETLuF3tM+97Dgx8CuzdGQ2ECNPPe2/Bz8z+WZS2J/0R/PD/tBccy+TX6EDK9lJJXT2ddtsVPPBYJGXHo5mSlYjnpFoDOq+Lmz3dW/9bsWZ879l+s1rv5Q1iW1A47qGkIxjHJHvJfmSf082eE2BkQ0oNEwh+pagyxK/Dn2VndwGXAeZljQhedFj/MpL8kZJlvcC5tTPkWVgdTOZ2h0xk5w4e9XY3/atqKfI14cVGEKGYzSbfIs+KeqXVu+RpEcqoHk08v0qIQyFZ68RCQImqhe+80zcFfR7b9t/dwLWRZPVetHha24/VynMm/CSgVbdVf4MUGgQzAXaAIM04p84uhSRwKj4IA6QzD09hPHtH/8MDDojIHeVeYysrVvMAChy6lhw0+nYIaT1CkhZKo0NjCv5A0Gvf64GOP+vZ41MOtbvB8z+47XXCewREfDO6rI891hpa5S1jHgaWczsBp2X0pAk7n9o/K72vY0d2dDdTCwndAfFqMooBRlSsYHKt8CXqp17k/nnvhWP5bIIcEAVsm/CV/A9SZ5XSAwOYN/tK2/h2MzwwQ1cTH5LqKvFHvImcA/wHHeiAWoJbdOUWcWZCg0yUBEWlElVXlKnsg90t4ptDiAewc3opyVDx+8l2OiZd4hig1ukPEHNs8ko592x06FhXhJT1+LL+yweVapxeXgljTIbTUn4HJt3B0j/QzRn9hsJJ5F2DkGTiOyMeHhjMFnR0tkT/ASovzxYNEgBtVbQLgIpEO0DxhIjMYSu+/wOdDoB7Q2BQO4eAdmJxCZJugS8aAuxjWAc8256CPja+xP5unwiOhMA4CwNC4woRLgOI8YXGMLjVaA4+tRDplET2JTCL4K7N5MXeD6tvjGFBMENUbRM8ELqfrgFLgeZvp3Mc0FwQgtB7Fo6RCpgECMxEwjkI0B59oslqyJFEZfVoarEmQveC4S2qu+9n/ddvf6P8c7JyCGWD/mZksgQunYNNFuo78eBCcFCSCfwMvWAJOPi8DHtf6K7AHXs1yBnAlQ+cBDpkRoJ7YD7RxwFzBYnxRJTttu2F1uh3zzv5bo9tuW3emM+hbdvsdpOdO4Z9zoAYo9lDmSwRsG98zVGnPdaz2obFhZQSue8kjIAchvTFSFaxNu4YA9RmcpPC6kNZUvSyTSPaniI4wzApLP2saM3oFSt4o10kn9SEEXmZVDlTfhgAXWHl4Z8P/9setfrcjIgjL6ct4wv6leWd1bjf9qfWbic9/2cXe/FHFpATp35rLJ1/VlI2RFBXwb6kCSKwdlTpZiZqBcGERIZdM+CpCd5heARgi9rbEtA8YlJl31sN7WA8C1H9MCCyvQY6gy7G+Ngup5DpDkGtImUlZAkgUsALj25Q9Io4xA3tInmIUUI4f+2goe4h+/4zSrdjYxjFkxg5M/zv9+S7yuO+x+bWG6Is6rMxLskSVul/OyK8z6m2/O5JBcr/b3hIh787dt90vdr9DsbEo1lLMUADog4OV3/2HZPxSW8Y2Vwr+BwJg8KXglIMJw4YBhIglAtBwrRlAJdjR0cpTQQVGkp3E5TPdZH1sMOq1RwOz2xx2G3bfFF7ve2R0ZCvTMiX+lt1KRt5vtNnVJBx/DfPXPo5OEmA+B/5BMGfRV7GcrxKqRMCqjzzdYGO133F3NOyNhtLJ/7mRwB+XQQttaVsY1FbtfFol58clz88nsDEcEJwUgQdizgLSc6CZvcyVPevy1AQkTB1tFYsOrFHLEamcll0oFRXxBT+RTyUyeB00cMN8DHEmwGc3LJ7vjTGoRBlLv7+A4f0TYgPeiWtLyO+fgA04FKhm0DCpL2co0D9W6iRU5DpGmMyHA/VXYlc4AOBULGN+7TwUwS+yU+bTPz/gXa9cnMBpycxczWo7tx2b2gCeIQSVUAGCEOeFG/oTNWXXZH4bvCTco+qzVVVY9BCY63KKxRVX4Ioio4Innj81x3Hio5fgPMGVhJsr8IeGOzb7o5YtQY9wnUIcjBVETjMKPmwcMjpq2jpc7S8i+NfV8dHl6SUe8zRgM7nVHZBDMZ/uin3NixtjTCDPIpL51qhvNdp2Eb2pAWiY6hyOW84Ar8Bz8FOOMnRfG0pI6jreFa75R8aIKz58OkKRQWygSJ7egyB1hu2H4gMxspB5DryoCs8K1lsUPOBy8t/EwUF05dze/USMpRsl6Vi/76jTg2Cd3lHhxragKZGpDwX8cOqHLKTgE9xcPmMiE+1FCliAIWnCgRkTsNGPwryrytMmEhOkkSzCmyVwMLT6n492FcHNq/9zZJD2bhzlUnh0cXR69geSQgUH/zfIIXWZYTPZ71gOrwWcE7lDVHgxxPtJkgVHY35+aHfNTvcXCJl3kK7td0gJK5x2AUhfkLXmKzKWY4x+b5KF+4Y3pZ0XxOvy6uj0PBcveKcojpLfiYTZ8LDuA8Ts4EU6HQiX6I6ywGFnBe6Leit2lrrSo/sYL/Xhv0trlCWwiT0ZComy3pNhTDhWVY1FFqQ+pgGTvNMWTcptFkwxTdJdkPL6TxRWMmxIX135OxJN0C9awqobXjaGHWfYBHZAM6H6BIowI7D5lN1m2JxniK7X39Da0f6Kxu64fnKppTHMgqAsiOu/jHFyQElAj2qlFvN9RU/XRFrWvXW7YeSwbYntLm36aTSw4fO41+82KqWsr5PqIv2OriZauGuDf4NYycA9i/hUtKUpiGeudtfFC+e3je4rBazUBr6D6PQLg++IcwzMiU1xtosL7+Tjy+UdDFH4xOMUNYXq4fSwToayNcPJVSL4V6pC7AzLKlgRwOvhXGNtN/YWuTvr6+c3CFzF5X8iccPd5cJ2cn5cPz/6/QvbHXt+/K+o/baipqZ3rUkZIpVMTFw7bdP+BQmv/R4cLLGISHSyJfFTUfKqEoOizqqn3dGB8294SAcvYbZMhdkSMz1RNicoYNwbix9wxigie0qPNIowH5W/L7RE5HVO5nl+oU5UxpStv1dtRxzZnCNSgWPCVeLGCE/2ZvBYFUbkuHVkn1y2jqwT6SI1j+vWaePqwj5pXamf3gaXQhraX2xZ9ulbNHOIqqo3v4wdTEkOc7AaeJYgcM7gzm5dG5jcvMfb2m2rhzNJusPiBTnHr/GyAGNpOmLBLgJS+TjAFpTldx5HhjhJQl8IJJapkFgGUBqLNOmqkpsLCrbIzdiQb+ZYFsnIp29mZM1/wGDTKbH0MEeV6Bq2qo4glCRmtDFEauHExjyTIdt8sI7o6Rbsj0mxzlSAHOe48h/Fkl8buwBtNN5T9yNWwm6W3jZ4zSaWxoxiU7RgFIE0AnxTwNFUQWiYn4xpgDDqYlImog4thMQUElUCeBwaX3zCxyF8Ayf2uI9ImghPjWyyJu0B3U2jopZBlpgSzaMRH4ss0fCQEvxjkuMDPcHFUcgLnCx5xAizxYTHh1sioZOzE/vm5vyq1aiS1tfxLZhCuXsYOFiteEBcEQjzYM0qwx90p9e1oUFCAjsxkGChwXjQhBhx3MCCcy69He7Tlid+iFzyEevjK8wKhB9BrGPjI1xHzdpgvQyk3MfSSIZrlZLEkulz7IvJCmiQ4hyMo2hdKdKwbEwHNSZOXJPsdhujdNA9OP/EHNxjsarXHVrDbh6ovyznFW2QVxdgzo+ty0ZdnUApYoUTAMcinY/XzmHUAUXZbX8h5UcvO0bxzr0BPAGIxMf3XYlV9DhmUbCCAtwbwwvWi79NWOInUsVIWAWK/gSHfFEVMEUlU8Psb0AgTTB64DZ/zwdaJ9nkVy58DZwctJB/KzXdCL2x2TYrMOC5F4FbwUifBr/FbIFvgxqtMuW82c+mt1UouYGaQpoTEuFTXneWrwpSVROWI9+acMKfGXqJwlbVGvad9cXp9j+ttWBqYHuiC9lwk/3L0O5jSQ6OqtftDOxPshFTkLGmyaqASPpmjEO6jYHdh/MdPzh2u/WJZonRlHNDtjAj1Em1keoZNngSxSkeebkhLrh1+TBqFW5szDzHV5Dj28dW6y+jFkg90gC2rllPnw0x4DWygDppebLiJMH5AT/378Vq5GZdcGO6+/OcpWNClo6FWzSOCXlMPY4YncC7Cn70gBAxtWvBERxgskWqfvJXmScmWcnWA49P4Z/iSnRvi7BV8AWAgNyrKb8OCVdoFFtin26sWv8S4BXQTbJfNklLrD5F2yZKJqiqK3DfkkufuBi6mVZqJJonj4wFp7umjvp227x3OlbDVMBMLKEXque53ik+ZcebpTiPy4V7ccugedftykL98fElLVVYQL564cFj+4vTsjtNG+Mpu3M7vLNFACwcUlS4JRfo2KSnvoldcpQ9rt0D74bE5ZxQWaGAlpGu8jxtM2gUJ40FUJOiCkP4RRM12WI8RyIEduKB/WBBuhJDEyTOMCW0VXHG//qMH5pLJeFsCl1BesxPZNCU+nJePA9nCJ4kZFulIS8OL/3725kGzoASFVZHA667ZdzFa5yzyxM2GYLuAk++qSH0Yw2hJBRgXpiKlC0R2Q3VVEAA8hqINyqX7+Toyj4DCaIi6/vEJRd8tdqfGzgtq+W0CbbcBDfEIYyIcwNardsbvsSF0hF/ExfqEsXLjRSqeYL6IaStLW5S9bmJsTd4wfZeCcIUE+hPtlWxIEfsq9JJcTTC600BP4OnepbT+TGe2nzCT+OpUaI5R05xRZnFaZIQecPfZrFAqfJvhPAM8pnnSwFLwxGXaIbZBM5skpT5ruKl2t0BOL2jnkgrvRvPqSK2H2LCcR1fjWMfVKNZviEVHAuOEyA74UiAmiN8Kyd9iYkLOUjIY0vyt0l7VZg2ly39NAvWvl7yTvw2uANJ/mretG17uCfDbX/ET+M4nJGM8TyhI2X2qGaUikdANeZiKrLETPcIs8UQCjXZoA12NG/ta1o9q4ndrMhe78ZUQ/IWMfvryQ+XqO+GqFEiuY9ZNZJNe67XlBsQE7LjnDXl2FdV7ZOWE4JkiNvy1KjOXSaHuxb6yvnSfZkMYr61vqQ3M9krj9iPyUbgxXKanCc+SVHktj7IIvrAYCsxgYX0zJKivUzxixT0EY8Cq0EwC+4+dTerVbHfUHX4iJhdR/fvxm8yL7RnMmi3JFDeWaIyQdc6WSDSO5oRce4/OPX+EwvIS9+rUegHmA8rHwId2x3sx3svPOHns14b4ukUB2WxQge4COfVGZS5bihSu4NhQcNRlwFNmOiObavfflD99vYvPbs5pN28n8Ib+N/Qx0znici1iTZGyT/rOQyVtEd+SbKFTIKKGTxirjr4EtQjpSfgi8n3mPmH6DVAIuGnF3CkvPp8mLS3uW8iba0cAcEKqT+clE8ZnWrOXBvfvzFJfm/OvOuOhneO+RV0gey2eTNrvvKI/XhTtMQkqpzKAn8WFkHauni3aZ+FGyS7bajJB57SR0bnzGDLJRbTxCcpKpVmu9ssqk5y+SDOQBU6GN912++nMd/WkKQUK7UfUc+RakFBzq1sO6rlLUd6biA8HbRizJNC84YYQeK+4PiVW2b+hcDstayrAGiLnKbKu5KXlg+eNkWJt4yOKrleiRgHNYa9APNmMmtKaNaahvjrDL0alS8Tqa/PsxPp4dzfLjwpSdgM7Qq1fb00pVoPpZZeFBWIhfYI+FR0+fBwBj/SqTFQI0jSwuiMwgtUDMp2WYbVAll4lmqsnDasfJ1DTYhC+V2lOnd1vdYHK1cmsUUZsOU0ZduwTnmqPOuW3LY4/Yoq4G457tdHgO8w9Rv+XJi+o6isZ8vSlLGts/GM4ZbASQsXo1yTlOfA0IpBlKcPS7qC0aBWCYLDSQjj7teO6LnDoXhiYHhjhOUAmZAGzT/+3Ol+bdstScdev/uFEI2V6fLtzFJiW0QDeDF/rkqY7zrXHSOEUkq7OpG+eYa7Hl1Fav2Vs4Szk58j3ZYSf5WRQelsYdqS/ptmolIvCzFCzaofBWASY6aYrbQOK06kA54rZKtB/xfnBZNeT+lzMCa4spkcIxmyJ8r506c0D7fAKl9IxTsFwvlIt5i+groElacpeJAnTUXQh/oRgsWAcixCQ7qan8U0z6kenS8ngUQq1T4FVQ8PK6VbD0stYetQ27flkeH1cIlc3VgjzFcP9YwDHALSvckHIKhGWfE9SAQw5/fmUxKctjO0+g/UDVdt3NYHkxacoZ2t21Yjdv6yEfvZg0o3LZUVap4Vs6vzCfO8MCCjctUt36V8u6Var27vV1ttOX0IQmSlW8u9iFCwMG437zpYJMeOVFBS9rj0xN0LsWtzXtXEVj3wlUtxOtAf6Pzxsa2GVZgIS0plW/1KVVv11NAftUpvsUiVbCIYqsr6UN8Sz5s7Ra6p2rSUqY7QmhKxxX5ftyL5UZS68183JoX6aq1qTC+CfsQ8X4mUTN5sRFT5C3elbxSDTmVbNtU3U0QK8pBKySjrMepv8dk+qnWDWKrvXknrUjiNTWOikY07mpOEh0kUH+Rm5Rlo8Qj/rQzMAVovX/SjoT3RXrg23ZL00t5AqK7GiZR0jkQ0KktDuEzRep5rsO0W5vwPYmEKHyyQE/j3ip/2CZP0hwy0ldGOCbC2MAcalvCjHzLYsDyYztHt6wrEBuLozhUr0LsJfhCVIPIXSy+p8L3a43278dlhsP9+9kgpVfVhhX0Do6FWcpjpJ70hE05ELVGxLuq4wuci1Bdu1nRdblmuxVASl6tMoL7sBdtSQvLsaluo+4gyhGRfMNhBihRmOoCRLtOn0sbgdxMUu1QybGWcg6ykiaizhPJzHdUWp0jS3EH2fG+NKvhCcHxiPDXpMew9qEQLbZ4MDkUqoc5fsz4/FJp8FDPKCDghDIhIYiBasxyxTOKIibBN58b2shxfpKvoqT7/A7Vz+dmLgiGhTwMJShPwt3gA+sgIyEkaYkX5nCotopLD4hspJVTQnyY80YOBxZzgs7O6eecMB28OT16a/7tP2PLm2cGbliG/Sc/jEXneb4S0AFHHm/WpSz/BXyyZKxhHfYVHIBJpGYVbpETNQlaM3mYofo5VUN9U6I7Uh36bcMhi4nzf/usIgpi3mQYBLkaTQMgSbNQtJoJJSIhCNVC5Anbl+lLSBZhK+q2yDFIyD1rdbQlU6NLC2dDJyO/WvGwa1JTartMGG3DTt8T3jkd6vicKDBoKQamGNXCECdUBXYHQlYZCslEFy1VZCNA7coB3/gkn8QRlNnaxEkXiYjUzWiwDnlbFJaIRSaDV3tcA8MVyDvzyXTjPOPiGpEHtU2BlhBchbcQSuMb1lxiv5rCIeTbZywJYSkCDaKaVvenx2H8i5AJmm2pCeNcIeCAClwQtL68tslBOptadaBRdEDa9eAqCpptg0D9U2JCPaXtd98v56XbL7PZ+nwYgL0XJTCg5kcnSp896SMGTSJNt9kB/ay6JFqVR8wUejRCkTpjjoLASIngmqNlXSrntbhEKzXE74QvWx/hWGoki4mxr5JDj0sSIPoHzaDv3YOV3L6pgfxG2rbGQR1lS8GN1f0aJlDliHlGySGjERB7oAXGE7cARcgQgkMiowuhOPot1vl+042i5PDQ6UR454GhJiOYw8PAJzg9vKPve9rMaL1uBCgasMgKKeWqSn6hL009LvYGCayWzvily0JmN/G1EQ1g+oS0/gKroAc+jwNby3NJVfphb7YdmJjHeVh9dgLiQn5WqAolSqTwNZATLBqJHBy1mkgu788NpKC3nOVMegIlhGIAdGIizYrKVVJY9PJYyNcCcYQcCljoQzWYU0GwypY18zFVIXGacP7zxoKzTjh+E2smA7Py5p32sSelLUVR7f/nTUJhYR0yFaOkTn4fKi3L6qrd8JGqztP8xKTbVVH6z6BmTtDGfBohKKnWziCVlp7BYtRh7q2YWgtbh/E5wxuB5hf0GptqIuvi3imX27mYTmCmv8mtQ3QI5F3BwUww2iDQYEWIssuKpCCe31ksOVMFZ5Ofh+XmpXmehpQ5DhH5ulqZ+6MkWj9cSWy0bhBEn68gZkFQ1ue+16cMzIqAbdZQO32ae9BfMFGu+xpFVZks+pPSBrGrLpMjn0XDOp6rAxMeQBaVZEL3i8+hvqZSsschb7Qz1kOnBboW4HqcfgMxgJ5cRcPqKqjai2gbpIZ8IL0MS7VFJt6SDSjDdLVIvxRA71xDefyAL92T0JV8LFLYU2xQPaVajBqUErbDQR9SVpxNX/x4z85opkQDPG+cWfax//f1f/+//ALUcp/JwlgAA"


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"expected exactly one match in {path}: found {count} for {old[:80]!r}")
    path.write_text(text.replace(old, new), encoding="utf-8")


def write_packet() -> str:
    raw = gzip.decompress(base64.b64decode(PACKET_GZIP_B64))
    parsed = json.loads(raw)
    assert parsed["packet_id"] == "UPD-20260906-CURRENT"
    assert parsed["known_at"] == CUTOFF
    PACKET_PATH.write_bytes(raw)
    return hashlib.sha256(raw.replace(b"\r\n", b"\n")).hexdigest()


def update_manifest(packet_sha: str) -> None:
    path = ROOT / "data/canonical-ledger/manifest-v2.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    accepted = manifest["accepted_updates"]
    if [item["sequence"] for item in accepted] != [1, 2, 3, 4]:
        raise RuntimeError("unexpected v2 accepted-update baseline")
    manifest["current_evidence_cutoff"] = CUTOFF
    accepted.append({
        "sequence": 5,
        "packet_id": "UPD-20260906-CURRENT",
        "path": "data/canonical-updates/UPD-20260906-CURRENT.json",
        "sha256": packet_sha,
        "known_at": CUTOFF,
    })
    path.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def patch_core_builder() -> None:
    path = ROOT / "scripts/build_canonical_current_state_v2.py"
    replace_once(
        path,
        'if spec["gate2_evidence_cutoff"]!=man["gate2_evidence_cutoff"]: raise ValueError("Gate2 cutoff mismatch")',
        'if spec["gate2_evidence_cutoff"]!=man["gate2_evidence_cutoff"]: raise ValueError("Gate2 cutoff mismatch")\n    current_cutoff=man.get("current_evidence_cutoff") or man["gate2_evidence_cutoff"]\n    if dt(current_cutoff)<dt(man["gate2_evidence_cutoff"]): raise ValueError("current evidence cutoff precedes Gate2 boundary")',
    )
    replace_once(
        path,
        'if known<=prior or known>dt(man["gate2_evidence_cutoff"]): raise ValueError("packet knowledge order/cutoff violation")',
        'if known<=prior or known>dt(current_cutoff): raise ValueError("packet knowledge order/cutoff violation")',
    )
    replace_once(
        path,
        'end=dt(state["release"]["gate2_evidence_cutoff"]).date(); out=[]',
        'end=dt(state["release"].get("current_osint_cutoff") or state["release"]["gate2_evidence_cutoff"]).date(); out=[]',
    )
    replace_once(
        path,
        'state["release"]["current_osint_cutoff"]=man["gate2_evidence_cutoff"]; state["release"]["current_osint_cutoff_display"]="September 5, 2026 00:37 ET"',
        'state["release"]["current_osint_cutoff"]=current_cutoff; state["release"]["current_osint_cutoff_display"]=dt(current_cutoff).strftime("%B %d, %Y %H:%M ET").replace(" 0"," ")',
    )
    replace_once(
        path,
        '"gate3_semantic_validation_ready":True})',
        '"gate3_semantic_validation_ready":True,"current_evidence_cutoff_frozen":True})',
    )
    replace_once(
        path,
        '        else:\n            if found: raise ValueError(f"duplicate entity {eid}")\n            coll.append(wrap(eid,ent["record"],{"kind":"GATE3_ACCEPTED_PACKET","packet_id":p["packet_id"]}))',
        '        else:\n            if found: raise ValueError(f"duplicate entity {eid}")\n            item=wrap(eid,ent["record"],{"kind":"GATE3_ACCEPTED_PACKET","packet_id":p["packet_id"]})\n            if et=="material_loss":\n                record=item["record"]; ref=record.get("event_ref")\n                if ref:\n                    if ref not in {x["event_id"] for x in state["chronology"]}: raise ValueError(f"material loss event link does not resolve {eid} -> {ref}")\n                    disposition={"disposition":"EVENT_LINK","canonical_event_ref":ref}\n                else:\n                    disposition={"disposition":"NON_EVENT_UNRESOLVED_DATE","reason":"No single canonical event date/link is established for this accepted material-loss observation.","additive":False}\n                item["semantic_disposition"]=disposition\n                sld=f"SLD-{re.sub(r\'[^A-Z0-9-]+\',\'-\',str(eid).upper())}"\n                state["entities"].setdefault("side_ledger_dispositions",[]).append(wrap(sld,{"side_ledger_disposition_id":sld,"side_record_id":eid,"side_collection":"material_losses",**copy.deepcopy(disposition)},{"kind":"GATE3_ACCEPTED_PACKET_SIDE_LEDGER_RECONCILIATION","packet_id":p["packet_id"]}))\n            coll.append(item)',
    )


def patch_final_builder() -> None:
    path = ROOT / "scripts/build_canonical_current_state_v2_final.py"
    replace_once(path, 'the frozen Gate 2 evidence cutoff.', 'the accepted current evidence cutoff while preserving the frozen Gate 2 boundary.')
    replace_once(path, 'cutoff = datetime.fromisoformat(state["release"]["gate2_evidence_cutoff"]).date()', 'cutoff = datetime.fromisoformat(state["release"].get("current_osint_cutoff") or state["release"]["gate2_evidence_cutoff"]).date()')
    replace_once(path, '"coverage_scope": "CONFLICT_DAY_1_THROUGH_GATE2_CUTOFF",', '"coverage_scope": "CONFLICT_DAY_1_THROUGH_CURRENT_EVIDENCE_CUTOFF",')
    replace_once(
        path,
        '        "war_daily_coverage_reaches_gate2_cutoff": bool(rows and rows[-1]["date"] == "2026-09-05"),',
        '        "war_daily_coverage_reaches_gate2_cutoff": bool(rows and rows[-1]["date"] >= datetime.fromisoformat(state["release"]["gate2_evidence_cutoff"]).date().isoformat()),\n        "war_daily_coverage_reaches_current_cutoff": bool(rows and rows[-1]["date"] == datetime.fromisoformat(state["release"]["current_osint_cutoff"]).date().isoformat()),',
    )


def patch_validator() -> None:
    path = ROOT / "scripts/validate_gate3.py"
    replace_once(
        path,
        '    coverage = state.get("daily_coverage") or []\n    if not coverage:',
        '    coverage = state.get("daily_coverage") or []\n    current_cutoff_date = datetime.fromisoformat(state["release"].get("current_osint_cutoff") or state["release"]["gate2_evidence_cutoff"]).date()\n    if not coverage:',
    )
    replace_once(
        path,
        '    if coverage[-1].get("date") != "2026-09-05":\n        fail(f"daily coverage does not reach Gate 2 cutoff date: {coverage[-1].get(\'date\')}")',
        '    if coverage[-1].get("date") != current_cutoff_date.isoformat():\n        fail(f"daily coverage does not reach current evidence cutoff date: {coverage[-1].get(\'date\')}")',
    )
    replace_once(
        path,
        '    if expected_date != date(2026, 9, 6):\n        fail("daily coverage span is incomplete")',
        '    if expected_date != current_cutoff_date + timedelta(days=1):\n        fail("daily coverage span is incomplete")',
    )
    replace_once(
        path,
        '    if state["release"]["gate2_evidence_cutoff"] != "2026-09-05T00:37:00-04:00":\n        fail("Gate 2 evidentiary boundary drifted")',
        '    if state["release"]["gate2_evidence_cutoff"] != "2026-09-05T00:37:00-04:00":\n        fail("Gate 2 evidentiary boundary drifted")\n    if state["release"].get("current_osint_cutoff") != "2026-09-06T14:10:43-04:00":\n        fail("current evidence cutoff does not match accepted Sep. 6 sweep")',
    )


def patch_workflows() -> None:
    gate3 = ROOT / ".github/workflows/gate3-validate.yml"
    replace_once(gate3, '      - "data/canonical-updates/UPD-20260905-GATE3-*.json"', '      - "data/canonical-updates/UPD-*.json"')
    replace_once(gate3, '          python scripts/validate_gate3_final.py 2>&1 | tee gate3-validator.log', '          python scripts/validate_gate3_final.py 2>&1 | tee gate3-validator.log\n          python tests/sep6-update-v2.test.py')
    validate = ROOT / ".github/workflows/validate.yml"
    replace_once(validate, '          python tests/gate3-packet-hash-portability.test.py', '          python tests/gate3-packet-hash-portability.test.py\n          python tests/sep6-update-v2.test.py')


def write_test() -> None:
    path = ROOT / "tests/sep6-update-v2.test.py"
    path.write_text('''#!/usr/bin/env python3\nfrom __future__ import annotations\n\nimport sys\nfrom pathlib import Path\n\nROOT = Path(__file__).resolve().parents[1]\nsys.path.insert(0, str(ROOT / "scripts"))\nimport build_canonical_current_state_v2_final as builder\n\n\ndef main() -> int:\n    state = builder.build_state(ROOT)\n    assert state["release"]["gate2_evidence_cutoff"] == "2026-09-05T00:37:00-04:00"\n    assert state["release"]["current_osint_cutoff"] == "2026-09-06T14:10:43-04:00"\n    events = {item["event_id"]: item for item in state["chronology"]}\n    for event_id in (\n        "G3-IRGC-US-WARSHIPS-20260905",\n        "G3-US-IRAN-TANKER-STRIKES-20260905",\n        "G3-IRGC-SIX-VESSEL-CLAIM-20260905",\n        "G3-IRGC-US-UNMANNED-VESSEL-CLAIM-20260906",\n        "G3-HORMUZ-BARGAINING-FORMULA-20260906",\n        "G3-LEBANON-HEZBOLLAH-ISRAEL-20260906",\n        "G3-YEMEN-HAYS-20260906",\n    ):\n        assert event_id in events\n    assert events["G3-IRGC-SIX-VESSEL-CLAIM-20260905"]["event"]["strike_countable"] is False\n\n    losses = {item["entity_id"]: item for item in state["entities"]["material_losses"]}\n    expected_losses = {\n        "MAT-IRN-DOWNY-20260905",\n        "MAT-IRN-STARK1-20260905",\n        "MAT-COM-KYLO-NOXEN-20260905",\n        "MAT-IRN-SINOPA-20260901-04",\n        "MAT-IRN-HAWK-20260901-04",\n    }\n    assert expected_losses <= set(losses)\n    for loss_id in expected_losses:\n        record = losses[loss_id]["record"]\n        assert record.get("military_platform") is False\n        assert losses[loss_id].get("semantic_disposition")\n    for loss_id in ("MAT-IRN-DOWNY-20260905", "MAT-IRN-STARK1-20260905", "MAT-COM-KYLO-NOXEN-20260905"):\n        assert losses[loss_id]["semantic_disposition"]["disposition"] == "EVENT_LINK"\n    for loss_id in ("MAT-IRN-SINOPA-20260901-04", "MAT-IRN-HAWK-20260901-04"):\n        assert losses[loss_id]["semantic_disposition"]["disposition"] == "NON_EVENT_UNRESOLVED_DATE"\n\n    claims = [item for item in state["entities"]["narrative_claims"] if item["entity_id"] == "LL-US-NOT-WAR-SMALL-POTATOES-20260904"]\n    assert len(claims) == 1\n    assert claims[0]["record"]["deception_score"] == 0\n    assert "SRC-6A02B13B992D" in claims[0]["record"]["source_ids"]\n    assert any("Sep. 5" in step for step in claims[0]["record"]["event_tree"])\n\n    new_claim_ids = {\n        "LL-IRAN-US-WARSHIP-DAMAGE-20260905",\n        "LL-IRAN-US-UNMANNED-VESSEL-20260906",\n        "LL-IRAN-SIX-VESSEL-SUCCESS-20260905",\n        "LL-PAKNEJAD-KHARG-550-HITS-20260906",\n        "LL-PAKNEJAD-KHARG-CONTINUED-OPS-20260906",\n        "LL-IRAN-QALIBAF-ESCALATION-DOCTRINE-20260906",\n    }\n    claim_map = {item["entity_id"]: item["record"] for item in state["entities"]["narrative_claims"]}\n    assert new_claim_ids <= set(claim_map)\n    for claim_id in new_claim_ids:\n        assert claim_map[claim_id]["deception_score"] == 0\n    assert claim_map["LL-IRAN-US-UNMANNED-VESSEL-20260906"]["truth_adjudication"] == "UNRESOLVED"\n\n    relationships = {item["entity_id"]: item["record"] for item in state["entities"].get("relationships", [])}\n    assert relationships["REL-MINAB-ATTRIBUTION-20260906"]["subject_event_id"] == "G3-MINAB-SCHOOL-20260228"\n    assert sum(1 for item in state["chronology"] if item["event_id"] == "G3-MINAB-SCHOOL-20260228") == 1\n    assert len([key for key in relationships if key.startswith("REL-STRAT-") and key.endswith("-20260906")]) == 6\n\n    shipping = {item["entity_id"]: item["record"] for item in state["entities"]["shipping"]}\n    assert shipping["SHIP-G3-HORMUZ-20260904"]["date"] == "2026-09-06"\n    assert "scope" in shipping["SHIP-G3-HORMUZ-20260904"]["ais_scope"].lower()\n    economics = {item["entity_id"]: item["record"] for item in state["entities"]["economics"]}\n    assert economics["ECON-G3-OIL-EXPORTS-20260903"]["date"] == "2026-09-06"\n    assert "REGIME_COLLAPSE_NOT_ESTABLISHED" in economics["ECON-G3-OIL-EXPORTS-20260903"]["adjudication"]\n\n    assert state["daily_coverage"][-1]["date"] == "2026-09-06"\n    print("sep6-update-v2: PASS - stable IDs, material-loss semantics, claim discipline, strategic state and cutoff verified")\n    return 0\n\n\nif __name__ == "__main__":\n    raise SystemExit(main())\n''', encoding="utf-8")


def main() -> int:
    packet_sha = write_packet()
    if packet_sha != "b0760685e1e2e726395d7786d1a7caf05c8ecd661881d2444f3f53a0a86754cd":
        raise RuntimeError(f"unexpected packet hash {packet_sha}")
    update_manifest(packet_sha)
    patch_core_builder()
    patch_final_builder()
    patch_validator()
    patch_workflows()
    write_test()
    print(f"sep6 bootstrap applied: {packet_sha}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
