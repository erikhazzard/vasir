"""Hard checks for references/narrative-journalism-rules.md (section 9). Labels: 9.N = section 9 check N; 7a/7b = section 7 caps.

Usage:  python3 -I hardchecks.py MODE FILE [--prologue] [--refs REF.txt ...]
MODE: narrative | historical | column
FILE: plain text, paragraphs separated by blank lines. Mark italic thought with *asterisks*.
      Paragraphs that start with '>' (block quotes, documents) or 'Q:'/'A:' (transcripts) are
      excluded from narration checks. A line '***' marks a section break.
--prologue: the draft is a prologue (allows the full date stamp in paragraphs 2-3).
--refs: reference texts you drew on; the draft is screened for 4-word runs shared with them.
Status: PASS / FAIL / REVIEW (a human must judge the listed hits, e.g. whether a moral word is attributed).
Rate checks apply only to drafts of 1,500 words or more; shorter drafts get per-piece caps (section 7).
"""
import re, sys, statistics as st

def sents(t):
    t = re.sub(r"\s+", " ", t.strip())
    t2 = re.sub(r"\b(Mr|Ms|Mrs|Dr|Jr|Sr|St|Co|Inc|Corp|Ltd|No|vs|Gov|Sen|Rep|Gen|Lt)\.", r"\1<DOT>", t)
    t2 = re.sub(r"\b([A-Z])\.", r"\1<DOT>", t2)
    t2 = re.sub(r"\b([ap])\.m\.(?= [a-z])", r"\1<DOT>m<DOT>", t2)
    parts = re.split(r"(?<=[.?!])[”\"’)]?\s+(?=[“\"(A-Z0-9$])", t2)
    return [s.replace("<DOT>", ".").strip() for s in parts if s.strip()]

WEEKDAYS = "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday"
MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December"

POLISH = [  # narrator epigram / explainer-scaffold formulas (rules X8)
    r"\bIt (was|is) one thing to\b", r"\bThe (logic|reasoning|lesson|point|problem|answer|math) (was|is) simple\b",
    r"\bthe kind (of \w+ )?(that )?(no|nobody|nothing)\b", r"\b(goes|went) like this:", r"\bHere['’]s the thing\b",
    r"\bIt turns out\b", r"\bThat would be a mistake\b", r"\bIt['’]s tempting to\b|\bIt is tempting to\b",
    r"\bOn paper,[^.?!]*[.?!]\s+In practice\b", r"\b(His|Her|Their|The) conclusion:",
    r"\bThe (larger|bigger|real|deeper) (problem|issue|question|point) (is|was) \w+:",
    r"\b(nobody|no one) wanted to need\b", r"\bmore complicated still\b", r"\bThen (he|she) said\b",
]
FEELBEAT = re.compile(r"^(He|She|They|[A-Z][a-z]+)( was| felt| seemed| had been)?( \w+ly)? (relieved|pleased|stunned|surprised|worried|furious|angry|nervous|anxious|confused|shocked|livid|incredulous|elated|unsure|uneasy|frustrated|annoyed|irritated|exhausted|hesitated|paused|nodded|sighed|shrugged|smiled|winced|frowned|bristled|demurred|balked|relented|agreed)\.$")
NEWSCOPY = r"\bpeople (familiar|briefed|close to)\b|\bfamiliar with the (matter|talks|situation|negotiations|discussions|deliberations|plans?)\b|\bbriefed on\b|\bdeclined to comment\b|\bdid not (respond|reply) to\b"
MORAL = r"\b(greed|greedy|hubris|reckless\w*|villain\w*|evil|arrogan\w*|fat cats?|venal|crook\w*|immoral|shameful)\b"
CLICHE = (r"\b(ticking|running out of time|race against (the )?(time|clock)|sweat(ing|ed|y|s)?|pulse|pulses|clench\w*|jaw|jaws|"
          r"tsunami|perfect storm|little did|as we now know|steely nerves|piercing eyes|on top of the world|alone at the top|epic collapse|"
          r"all hell (would |had |was about to )?(break|broke|breaks) loose|Masters of the Universe)\b|\bbr\w+ (\w+ ){0,3}to (its|their|his|her) knees\b")
HINDSIGHT = r"\bin (retrospect|hindsight)\b"
DISASTER = r"\b(storm clouds|clouds (were|had been) gathering|forecasting a storm|meltdown|melting down|abyss|apocalyp\w*|Armageddon|bloodbath|firestorm|maelstrom)\b"
PROFANE = r"\b(fuck\w*|shit\w*|asshole\w*|goddam\w*|bullshit|bastard\w*)\b"
OPENERS = r"(?:^|[.?!”]\s+)(However|Yet|Now|Even)\b"
THRILLTAG = r"[,?”]\s*(he|she|[A-Z][a-z]+) (hissed|snapped|muttered|whispered|sneered|mused|pondered|spat)\b|[,?”]\s*(hissed|snapped|muttered|whispered|sneered|mused|pondered|spat) (he|she|[A-Z][a-z]+)\b"
BADCLOCK = r"(?<![:\d])\b\d{1,2} ?(a\.m\.|p\.m\.|A\.M\.|P\.M\.|am|pm)(?=[\s,.;])|\b\d{1,2}:\d{2} ?(A\.M\.|P\.M\.|am|pm|AM|PM)\b|o['’]clock"
SHORTSTAMP = r"\bIt was (just |shortly )?(past|before|after) \d{1,2}:\d{2}"
DAYSTAMP = r"(?:^|[.?!]\s+)It was (now )?(\w+ ){0,2}(" + WEEKDAYS + "|" + MONTHS + r")\b"
PARTICIPIAL = re.compile(r"(?:, |^|[.?!]\s+)(hoping|trying|wanting|relieved|reflecting|knowing|worried|fearing|eager|determined|anxious|desperate|"
                         r"mindful|sensing|realizing|figuring|unsure|aware|careful|concerned|frustrated|annoyed|irritated|pleased|surprised|stunned|nervous)\b", re.I)
FIRSTP = r"(?<!War )\bI\b(?![.’'])|\b(me|my|we|our)\b|\bus\b(?!\.)"
MODALSET = r"\b(it is|It is|may be|perhaps|Perhaps|will most likely|should|there is|There is)\b"
SELFANSWER = r"\?\s+(Yes|No|Yep|Nope|Sure|Maybe|Not yet|Hardly|A lot|Absolutely|Not really|Not quite|Probably)\b[^.?!]{0,20}[.]"

# 4-grams the rules prescribe as formulas (B6 stamp, B15/N1 attributions, B17b) are not copying
FORMULA_OK = ["it was just past", "it was just before", "it was just after", "would later become", "later told a friend",
              "he would later remember", "in today’s dollars", "in today's dollars", "told him that", "told her that"]
STOP = set("the of a an to in that and on at for was had he his she her it is with as by be would from but not have this were they them who which".split())
GENERIC = set("chief executive officer president secretary chairman treasury bank firm company street wall percent million billion investment new york".split())
QRE = re.compile(r"“[^”]*”?|\"[^\"]*\"?")
ITAL = re.compile(r"\*[^*]+\*")
def narr(p):
    return ITAL.sub(" ", QRE.sub(" ", p))
def wc(t):
    return len(t.split())

def load(path):
    raw = open(path, encoding="utf-8").read()
    blocks = [b.strip() for b in re.split(r"\n\s*\n", raw) if b.strip()]
    paras, sections, cur = [], [], []
    for b in blocks:
        if re.fullmatch(r"(\*\s*){3}|#+.*|[~—-]{3,}", b):
            if cur: sections.append(cur); cur = []
            continue
        kind = "block" if (b.startswith(">") or re.match(r"[QA]:", b)) else "narr"
        paras.append((kind, b.lstrip(">"))); cur.append(len(paras) - 1)
    if cur: sections.append(cur)
    return paras, sections

def run(mode, path, refs=None, prologue=False):
    paras, sections = load(path)
    alltext = "\n".join(p for _, p in paras)
    nw = wc(alltext)
    np_ = [p for k, p in paras if k == "narr"]
    ntext = "\n".join(narr(p) for p in np_)
    nnw = max(1, wc(ntext))
    long_ = nw >= 1500
    R = []
    def add(name, status, detail):
        if status is True: status = "PASS"
        elif status is False: status = "FAIL"
        R.append((name, status, detail))
    def hits(pat, text, flags=0):
        return [m.group(0) for m in re.finditer(pat, text, flags)]

    # ---- all modes
    add("9.1a no '%'", "%" not in alltext, f"{alltext.count('%')}")
    pol = [h for p in POLISH for h in hits(p, ntext)]
    add("9.2 no narrator epigram/scaffold formulas", not pol, pol[:6])
    if refs:
        grams = set()
        for f in refs:
            w = re.findall(r"[\w’'$.]+", f.lower())
            grams |= {" ".join(w[i:i+4]) for i in range(len(w) - 3)}
        dw = re.findall(r"[\w’'$.]+", alltext.lower())
        shared = sorted(g for g in ({" ".join(dw[i:i+4]) for i in range(len(dw) - 3)} & grams)
                        if not any(g.startswith(w) or w in g for w in FORMULA_OK)
                        and not any(re.fullmatch(r"[\d$.,]+|a\.m\.|p\.m\.", x) for x in g.split())
                        and sum(x in STOP or x in GENERIC for x in g.split()) < 3)
        add("9.3 no 4-word run shared with the reference texts", not shared, shared[:8])
    bang = ntext.count("!")
    add("9.1b no '!' outside quotes and *italic thought*", bang == 0, f"{bang}")

    if mode in ("narrative", "historical"):
        fp = hits(FIRSTP, ntext)
        add("9.4 first person in narration (allowed only in a prologue method passage or a historical essay passage)", "REVIEW" if fp else True, f"{len(fp)} {fp[:6]}")
        says = hits(r"\bsays\b", ntext); nc = hits(NEWSCOPY, ntext, re.I); rec = hits(r"\brecall(ed|s|ing)?\b", ntext)
        add("9.5 no 'says'; no news-copy formulas; 'recalled' <=1", not says and not nc and len(rec) <= 1, f"says {len(says)}; newscopy {nc[:4]}; recall {len(rec)}")
        mo = hits(MORAL, ntext, re.I)
        add("9.6 moral words in narration: each must be attributed to a character's view (historical essay: <=1 generic 'we' line)", "REVIEW" if mo else True, mo[:6])
        cl = hits(CLICHE, ntext, re.I); hs = hits(HINDSIGHT, ntext, re.I)
        ds = sum(1 for p in np_ for s in sents(narr(p)) if re.search(DISASTER, s, re.I))
        add("9.7 no thriller/stock cliches; 'in hindsight/retrospect' <=1 (panorama/essay only); weather/disaster metaphors <=2 sentences per chapter",
            not cl and len(hs) <= 1 and ds <= 2, f"cliche {cl[:5]}; hindsight {len(hs)}; disaster sentences {ds}")
        bc = hits(BADCLOCK, ntext)
        add("9.8a clock times as H:MM a.m./p.m. (noon, midnight, 'H:MM in the afternoon' allowed); no o'clock", not bc, bc[:5])
        offs, w = [], 0
        for k, p in paras:
            for m in re.finditer(SHORTSTAMP, p): offs.append(w + wc(p[:m.start()]))
            w += wc(p)
        late = [o for o in offs if o > 1600]
        add("9.8b 'It was just past H:MM' only in the opening scene (first ~1,500 words), <=3", len(offs) <= 3 and not late, f"{len(offs)} at word offsets {offs}")
        sec_pos = {}
        for s in sections:
            for j, idx in enumerate(s): sec_pos[idx] = j
        fail6, rev6 = [], []
        for idx, (k, p) in enumerate(paras):
            if k != "narr" or not re.search(DAYSTAMP, p): continue
            j = sec_pos.get(idx, idx)
            if j == 0: continue
            if prologue and idx in (1, 2): continue
            (fail6 if j in (1, 2) else rev6).append(f"¶{idx+1}")
        add("9.8c no day/date stamp in a scene's 2nd-3rd paragraph outside a prologue; later stamps only where the day changes",
            False if fail6 else ("REVIEW" if rev6 else True), f"fail {fail6}; review {rev6}")
        se = hits(r"\bseem(s|ed|ing|ingly)?\b", ntext, re.I); ap = hits(r"\bapparently\b", ntext, re.I)
        okse = (1000 * len(se) / nnw <= 0.9) if long_ else len(se) <= 1
        add("9.9a 'seem' family <=0.8/1k (short draft: <=1); 'apparently' <=1", okse and len(ap) <= 1, f"seem {len(se)} ({1000*len(se)/nnw:.2f}/1k); apparently {len(ap)}")
        pr = hits(PROFANE, ntext, re.I)
        add("9.9b profanity only inside quotes or *italic thought*", not pr, pr[:4])
        op = hits(OPENERS, ntext)
        add("9.10 Yet/Now/Even/However sentence openers: together <=1 per 2,500 words (<=1 in shorter drafts)", len(op) <= max(1, nw // 2500), f"{len(op)} {[o.strip(' .') for o in op[:5]]}")
        dashes = alltext.count("—"); spaced = len(re.findall(r" — ", alltext))
        okd = (4.0 <= 1000 * dashes / nw <= 9.0) if long_ else True
        add("9.13a em dashes closed (no ' — '); 4-9/1k per chapter (typical 4.7-6.3)", spaced == 0 and okd, f"{dashes} = {1000*dashes/nw:.2f}/1k; spaced {spaced}")
        semi = alltext.count(";"); par = alltext.count("(")
        add("9.13b semicolons <=2.5/1k; parentheses <=1.5/1k (long drafts)", (not long_) or (1000*semi/nw <= 2.5 and 1000*par/nw <= 1.5), f"semicolons {1000*semi/nw:.2f}/1k; parens {1000*par/nw:.2f}/1k")
        fb = [s for p in np_ for s in sents(narr(p)) if wc(s) <= 5 and FEELBEAT.match(s.strip())]
        add("9.11a no stand-alone feeling beat of <=5 words ('X was relieved.', 'X hesitated.')", not fb, fb[:5])
        tt = hits(THRILLTAG, alltext)
        add("9.11b no hissed/snapped/muttered/whispered/sneered/mused/pondered/spat tags", not tt, tt[:4])
        lens = [wc(p) for p in np_]
        one = [p for p in np_ if len(sents(p)) == 1]
        short15 = [l for l in lens if l <= 15]; over120 = [l for l in lens if l > 120]; tiny = [l for l in lens if l < 3]
        sl = [wc(s) for p in np_ for s in sents(p)]
        if long_:
            ok = 52 <= st.mean(lens) <= 72 and 0.13 <= len(one)/len(np_) <= 0.30 and len(short15)/len(np_) <= 0.22 and len(over120)/len(np_) <= 0.16 and not tiny
            add("9.13c paragraphs: mean 52-72w; 13-30% one-sentence; <=22% at <=15w (contemporary mode <=15%); <=16% over 120w; none under 3w", ok,
                f"mean {st.mean(lens):.1f}; one-sent {100*len(one)/len(np_):.0f}%; <=15w {100*len(short15)/len(np_):.0f}%; >120w {100*len(over120)/len(np_):.0f}%; <3w {len(tiny)}")
            ok = 17 <= st.mean(sl) <= 22.5 and 0.06 <= sum(1 for x in sl if x <= 6)/len(sl) <= 0.17 and 0.08 <= sum(1 for x in sl if x >= 35)/len(sl) <= 0.15
            add("9.13d sentences: mean 17-22w; 7-17% at <=6w; 8-14% at >=35w (soft)", "PASS" if ok else "REVIEW",
                f"mean {st.mean(sl):.1f}; <=6w {100*sum(1 for x in sl if x<=6)/len(sl):.1f}%; >=35w {100*sum(1 for x in sl if x>=35)/len(sl):.1f}%")
        else:
            add("9.13c short draft: no paragraph under 3 words; one-sentence paragraphs median >=12 words", not tiny and (not one or st.median([wc(p) for p in one]) >= 12), f"<3w {len(tiny)}; one-sent median {st.median([wc(p) for p in one]) if one else '-'}w")
        # 9.14 stakes beat (B5b): a 3-12-word sentence, or a colon reveal of that length, ends one of the first three paragraphs
        firsts = [p for p in np_ if narr(p).strip()][:3]
        beat = []
        for p in firsts:
            ss = sents(p)
            if not ss: continue
            last = ss[-1]
            cand = [last] + [m.group(1) for m in re.finditer(r":\s+([A-Z][^:]*)$", last)]
            if any(3 <= wc(c) <= 12 for c in cand): beat.append(last[-70:])
        add("9.14 opening scene: a 3-12-word stakes beat (or colon reveal) ends one of the first three paragraphs", "PASS" if beat else "REVIEW", beat[:2])
        # marker density over the 12-marker set (quotes removed): normal range 2.3-8.7 per 500 words, max window 14
        DENS = [r"\b\d{1,2}:\d{2}\b", r"\bIt was (just )?(past|before|after|now)\b", r"\btold (him|her|them|[A-Z][a-z]+)\b", r"\?",
                r"\b(like (a|an|the|being)|as if|as though)\b", r"\b(\w+[- ])?(largest|biggest)\b", r"-year-old\b", r"\$\d",
                r"[a-z\)]: [A-Z][a-z]", r"(^|[.?!”] )As [a-z]", r"\b(known as|nickname|-speak|argot|so-called|parlance|jargon)\b", r"\("]
        words = " ".join(narr(p) for p in np_).split()
        wins = [" ".join(words[k:k+500]) for k in range(0, max(1, len(words)), 500)]
        counts = [sum(len(re.findall(d, w)) for d in DENS) for w in wins]
        per500 = 500 * sum(counts) / max(1, len(words))
        st_ = "PASS" if per500 <= 9 and max(counts) <= 14 else ("REVIEW" if per500 <= 12 and max(counts) <= 14 else "FAIL")
        add("7a marker density: 3-9 per 500 words, no 500-word window over 14", st_, f"{per500:.1f} per 500 words; max window {max(counts)}")
        pc = [m.group(1) for p in np_ for m in PARTICIPIAL.finditer(narr(p))]
        okp = (0.3 <= 1000*len(pc)/nnw <= 2.0) if long_ else (len(pc) >= 1)
        add("9.12 participial motive/feeling clauses on actions or tags, ~0.5-1.3/1k (short draft: at least 1)", "PASS" if okp else "REVIEW", f"{len(pc)} = {1000*len(pc)/nnw:.2f}/1k {pc[:4]}")
        told = hits(r"\btold (him|her|them|[A-Z][a-z]+)\b", ntext)
        cap = 2.5 if mode == "narrative" else 1.2
        okt = (1000*len(told)/nnw <= cap) if long_ else len(told) <= max(2, round(nw/250))
        add(f"7b 'told' + listener <= {cap}/1k (short draft: <=2 per 500 words)", okt, f"{len(told)} = {1000*len(told)/nnw:.2f}/1k")

    if mode == "column":
        add("9.15a no 'To be sure', 'In sum', 'In conclusion'", not hits(r"\bTo be sure\b|\bIn sum\b|\bIn conclusion\b|\bTo sum up\b", alltext), "")
        first = sents(paras[0][1])[0] if paras else ""
        quote_lede = first.lstrip().startswith(("“", "\""))
        add("9.15b first sentence: aim <=18 words; over 30 only for a quotation lede or a dated news peg; never over 40", False if wc(first) > 40 else ("PASS" if (wc(first) <= 30 or quote_lede) else "REVIEW"), f"{wc(first)}w{' (quote lede)' if quote_lede else ''}")
        add("9.15c at least one concession followed by a turn (But, Still, though; praise-then-But counts)", "REVIEW", "judge by hand")
        p1 = narr(paras[0][1]) if paras else ""
        add("9.15d no narrator 'I' in the first paragraph", not re.search(r"(?<!War )\bI\b(?![.’'])", p1), "")
        last = sents(paras[-1][1])[-1] if paras else ""
        add("9.15e last sentence <=24 words in about 3 pieces of 4", "PASS" if wc(last) <= 24 else "REVIEW", f"{wc(last)}w")
        dashes = len(re.findall(r" — ", alltext)); closed = len(re.findall(r"\w—\w", alltext))
        okd = (3 <= 1000*dashes/nw <= 15) if nw >= 700 else True
        add("9.15f spaced em dashes ( — ), 3-15/1k in any one piece (typical 8.6-9.4); none closed", okd and closed <= 1, f"{dashes} = {1000*dashes/nw:.2f}/1k; closed {closed}")
        caps = {"perhaps": (r"\bperhaps\b", 4), "of course": (r"\bof course\b", 3), "clearly": (r"\bclearly\b", 2), "In truth": (r"\bIn truth\b", 2),
                "(More on that": (r"\(More on that", 1), "self-answers": (SELFANSWER, 4)}
        over = {k: len(re.findall(p, ntext, re.I)) for k, (p, c) in caps.items() if len(re.findall(p, ntext, re.I)) > c}
        add("9.15g per-piece caps: perhaps<=4, of course<=3, clearly<=2, In truth<=2, More-on-that<=1, self-answers<=4", not over, over)
        ms = hits(MODALSET, ntext)
        add("9.15h modal set (it is, may be, perhaps, will most likely, should, there is) <=22 per 1k narration words (short: <=5 per 300 words)",
            (1000*len(ms)/nnw <= 22) if nw >= 600 else len(ms) <= max(5, round(5*nw/300)), f"{len(ms)} = {1000*len(ms)/nnw:.1f}/1k")
        lab = hits(r"(?:^|[.?!”]\s+)[A-Z][\w’']*(?: [\w’']+){0,4}:(?= )", ntext)
        add("9.15i colon set-ups <=3 per piece", len(lab) <= 3, f"{len(lab)}")
        lens = [wc(p) for p in np_]
        if nw >= 600:
            ok = 34 <= st.mean(lens) <= 58 and sum(1 for l in lens if l <= 15)/len(lens) <= 0.25
            add("9.15j paragraphs: mean 34-58w in any one piece (typical 44-46); <=25% at <=15w (typical 7-9%)", ok,
                f"mean {st.mean(lens):.1f}; <=15w {100*sum(1 for l in lens if l<=15)/len(lens):.0f}%")
    return R, nw

def load_refs(paths):
    return [open(p, encoding="utf-8").read() for p in paths]

if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] not in ("narrative", "historical", "column"):
        sys.exit(__doc__)
    mode, path = sys.argv[1], sys.argv[2]
    refs = None
    if "--refs" in sys.argv:
        i = sys.argv.index("--refs") + 1
        rp = []
        while i < len(sys.argv) and not sys.argv[i].startswith("--"):
            rp.append(sys.argv[i]); i += 1
        refs = load_refs(rp)
    R, nw = run(mode, path, refs, prologue="--prologue" in sys.argv)
    print(f"{path}  mode={mode}  words={nw}  {'(long-draft rate checks)' if nw >= 1500 else '(short draft: caps, not rates)'}")
    for name, res, det in R:
        print(f"  {res:6s}  {name}  {det}")
