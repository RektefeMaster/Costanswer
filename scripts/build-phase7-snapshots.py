#!/usr/bin/env python3
"""Build Phase 7 official snapshots from already-downloaded government files.

This is an ingest helper, not request-time code. TS schemas re-validate the output
before promotion. Official HUD county-level FMR workbooks are the source.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import zipfile
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path("/tmp/costanswer-phase7")
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

STATE_FIPS_TO_USPS = {
    "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT",
    "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL",
    "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD",
    "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE",
    "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
    "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
    "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV",
    "55": "WI", "56": "WY",
}
USPS_TO_FIPS = {v: k for k, v in STATE_FIPS_TO_USPS.items()}
USPS_TO_NAME = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "DC": "District of Columbia",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois",
    "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana",
    "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon",
    "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota",
    "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia",
    "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}
NAME_TO_USPS = {name.upper(): usps for usps, name in USPS_TO_NAME.items()}
NAME_TO_USPS["DISTRICT OF COLUMBIA"] = "DC"

CENSUS_SENTINELS = {-222222222, -333333333, -555555555, -666666666, -888888888, -999999999}

RPP_LINES = {
    1: "allItems",
    2: "goods",
    3: "housingRents",
    4: "utilities",
    5: "otherServices",
}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def slug(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def read_gazetteer(zip_path: Path) -> list[list[str]]:
    with zipfile.ZipFile(zip_path) as zf:
        name = zf.namelist()[0]
        text = zf.read(name).decode("latin-1")
    rows = []
    for i, line in enumerate(text.splitlines()):
        rows.append(line.rstrip("\n").split("\t"))
    return rows


def xlsx_rows(path: Path) -> list[list[str]]:
    z = zipfile.ZipFile(path)
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    shared = []
    for si in root.findall("m:si", NS):
        shared.append("".join((t.text or "") for t in si.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")))
    sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    rows = []
    for row in sheet.findall("m:sheetData/m:row", NS):
        vals: dict[int, str] = {}
        for c in row.findall("m:c", NS):
            ref = c.get("r", "A1")
            col = 0
            for ch in ref:
                if ch.isdigit():
                    break
                col = col * 26 + (ord(ch) - 64)
            v = c.find("m:v", NS)
            if v is None:
                continue
            if c.get("t") == "s":
                vals[col] = shared[int(v.text)]
            else:
                vals[col] = v.text or ""
        if not vals:
            continue
        width = max(vals)
        rows.append([vals.get(i, "") for i in range(1, width + 1)])
    return rows


def parse_counties(rows: list[list[str]]) -> list[dict]:
    header, *body = rows
    idx = {name.strip(): i for i, name in enumerate(header)}
    out = []
    for row in body:
        if len(row) <= idx["GEOID"]:
            continue
        geoid = row[idx["GEOID"]].strip()
        usps = row[idx["USPS"]].strip()
        if usps not in USPS_TO_NAME:
            continue
        out.append({
            "id": f"county:{geoid}",
            "kind": "county",
            "geoid": geoid,
            "stateFips": geoid[:2],
            "countyFips": geoid[2:],
            "state": usps,
            "name": row[idx["NAME"]].strip(),
            "lsad": row[idx["LSAD"]].strip() if "LSAD" in idx else "",
            "geographyVintage": "2024",
        })
    return out


def parse_cbsas(rows: list[list[str]]) -> list[dict]:
    header, *body = rows
    idx = {name.strip(): i for i, name in enumerate(header)}
    out = []
    for row in body:
        if len(row) <= idx["GEOID"]:
            continue
        code = row[idx["GEOID"]].strip()
        name = row[idx["NAME"]].strip()
        lsad = row[idx["LSAD"]].strip() if "LSAD" in idx else ""
        if lsad not in {"M1", "Metropolitan Statistical Area"} and "Metro" not in lsad and "Metropolitan" not in name:
            # Keep metros only for v1 search of "metro". Micropolitan stay in delineation maps.
            if "Micro" in name or lsad in {"M2", "Micropolitan Statistical Area"}:
                kind = "micro"
            else:
                kind = "metro"
        else:
            kind = "metro" if "Micro" not in name else "micro"
        out.append({
            "id": f"cbsa:{code}",
            "kind": "cbsa",
            "cbsaCode": code,
            "name": name,
            "lsad": lsad,
            "metroKind": kind,
            "geographyVintage": "omb-2023-07-21",
        })
    return out


def parse_places(rows: list[list[str]]) -> dict[str, dict]:
    header, *body = rows
    idx = {name.strip(): i for i, name in enumerate(header)}
    by_geoid = {}
    for row in body:
        if len(row) <= idx["GEOID"]:
            continue
        geoid = row[idx["GEOID"]].strip()
        usps = row[idx["USPS"]].strip()
        if usps not in USPS_TO_NAME:
            continue
        by_geoid[geoid] = {
            "id": f"place:{geoid}",
            "kind": "place",
            "geoid": geoid,
            "stateFips": geoid[:2],
            "placeCode": geoid[2:],
            "state": usps,
            "name": row[idx["NAME"]].strip(),
            "lsad": row[idx["LSAD"]].strip() if "LSAD" in idx else "",
            "geographyVintage": "2024",
        }
    return by_geoid


def parse_delineation(rows: list[list[str]]) -> tuple[list[dict], dict[str, list[str]], dict[str, set[str]], dict[str, dict]]:
    header_i = next(i for i, row in enumerate(rows) if row and row[0] == "CBSA Code")
    body = rows[header_i + 1:]
    counties_by_cbsa: dict[str, list[str]] = defaultdict(list)
    states_by_cbsa: dict[str, set[str]] = defaultdict(set)
    cbsa_meta: dict[str, dict] = {}
    for row in body:
        if len(row) < 12 or not row[0]:
            continue
        cbsa, _div, _csa, title, metro_micro, *_rest = row[:12]
        county_name, state_name, state_fips, county_fips, central = row[7:12]
        state_fips = state_fips.zfill(2)
        county_fips = county_fips.zfill(3)
        if state_fips not in STATE_FIPS_TO_USPS:
            continue
        geoid = f"{state_fips}{county_fips}"
        counties_by_cbsa[cbsa].append(geoid)
        states_by_cbsa[cbsa].add(STATE_FIPS_TO_USPS[state_fips])
        cbsa_meta[cbsa] = {
            "cbsaCode": cbsa,
            "title": title,
            "metroKind": "metro" if metro_micro.startswith("Metropolitan") else "micro",
        }
    maps = [{"cbsaCode": code, "countyGeoid": geoid} for code, geoids in counties_by_cbsa.items() for geoid in geoids]
    return maps, counties_by_cbsa, states_by_cbsa, cbsa_meta


def parse_principal_cities(rows: list[list[str]], places: dict[str, dict]) -> list[dict]:
    header_i = next(i for i, row in enumerate(rows) if row and row[0] == "CBSA Code")
    out = []
    seen = set()
    for row in rows[header_i + 1:]:
        if len(row) < 6 or not row[0]:
            continue
        cbsa, title, metro_micro, city_name, state_fips, place_code = row[:6]
        state_fips = str(int(float(state_fips))).zfill(2) if state_fips else ""
        place_code = str(int(float(place_code))).zfill(5) if place_code else ""
        if state_fips not in STATE_FIPS_TO_USPS:
            continue
        geoid = f"{state_fips}{place_code}"
        key = (geoid, cbsa)
        if key in seen:
            continue
        seen.add(key)
        gaz = places.get(geoid)
        out.append({
            "placeGeoid": geoid,
            "cbsaCode": cbsa,
            "principalCityName": city_name,
            "state": STATE_FIPS_TO_USPS[state_fips],
            "metroKind": "metro" if metro_micro.startswith("Metropolitan") else "micro",
            "gazetteerMatch": gaz["name"] if gaz else None,
        })
    return out


def county_lookup_keys(name: str) -> set[str]:
    n = re.sub(r"\s+", " ", name).strip()
    keys = {n.lower()}
    stripped = n
    for suffix in (
        " County", " Parish", " Borough", " Census Area", " Municipality",
        " city", " City", " Planning Region",
    ):
        if stripped.lower().endswith(suffix.lower()):
            stripped = stripped[: -len(suffix)]
            keys.add(stripped.lower())
    keys.add(n.lower().replace(".", ""))
    return {k for k in keys if k}


def build_county_name_index(counties: list[dict]) -> dict[str, dict[str, list[str]]]:
    index: dict[str, dict[str, list[str]]] = defaultdict(lambda: defaultdict(list))
    for county in counties:
        for key in county_lookup_keys(county["name"]):
            index[county["state"]][key].append(county["geoid"])
    return index


def unique_county(index, state: str, token: str) -> str | None:
    token = token.strip().strip(",")
    if not token:
        return None
    candidates = []
    for key in county_lookup_keys(token):
        candidates.extend(index.get(state, {}).get(key, []))
    unique = list(dict.fromkeys(candidates))
    if len(unique) == 1:
        return unique[0]
    return None


TERRITORY_USPS = {"AS", "GU", "MP", "PR", "VI"}


def classify_hud_area_code(code: str, official_name: str) -> str:
    lname = official_name.lower()
    if code.startswith("NCNTY"):
        return "nonmetro"
    if "hud metro fmr" in lname or "hmfa" in lname:
        return "hmfa"
    if "exception" in lname:
        return "exception"
    return "msa"


def parse_hud_xlsx(path: Path, fiscal_year: int) -> dict:
    rows = xlsx_rows(path)
    header = [cell.strip() for cell in rows[0]]
    idx = {name: i for i, name in enumerate(header)}
    required = ["stusps", "state", "hud_area_code", "countyname", "hud_area_name", "fips", "fmr_0", "fmr_1", "fmr_2", "fmr_3", "fmr_4"]
    missing = [name for name in required if name not in idx]
    if missing:
        raise SystemExit(f"{path.name} missing columns {missing}")

    areas_by_code: dict[str, dict] = {}
    county_to_areas: dict[str, set[str]] = defaultdict(set)
    stats = {"sourceRows": 0, "territoryRows": 0, "duplicateAreaRentMismatch": 0}

    for row in rows[1:]:
        usps = row[idx["stusps"]].strip()
        if usps in TERRITORY_USPS:
            stats["territoryRows"] += 1
            continue
        if usps not in USPS_TO_FIPS:
            continue
        stats["sourceRows"] += 1
        code = row[idx["hud_area_code"]].strip()
        name = row[idx["hud_area_name"]].strip()
        fips = re.sub(r"\.0$", "", row[idx["fips"]].strip())
        if len(fips) < 5:
            continue
        county_geoid = fips[:5]
        bedrooms = {
            "studio": int(float(row[idx["fmr_0"]])),
            "br1": int(float(row[idx["fmr_1"]])),
            "br2": int(float(row[idx["fmr_2"]])),
            "br3": int(float(row[idx["fmr_3"]])),
            "br4": int(float(row[idx["fmr_4"]])),
        }
        area_id = f"hud-fmr:{code}"
        existing = areas_by_code.get(code)
        if existing is None:
            areas_by_code[code] = {
                "id": area_id,
                "hudAreaCode": code,
                "fiscalYear": fiscal_year,
                "officialName": name,
                "kind": classify_hud_area_code(code, name),
                "stateCodes": [usps],
                "bedrooms": bedrooms,
                "identityMethod": "official-hud-area-code",
            }
        else:
            if existing["bedrooms"] != bedrooms:
                stats["duplicateAreaRentMismatch"] += 1
            if usps not in existing["stateCodes"]:
                existing["stateCodes"].append(usps)
                existing["stateCodes"].sort()
        county_to_areas[county_geoid].add(code)

    unique_maps = []
    ambiguous = []
    for geoid, codes in sorted(county_to_areas.items()):
        if len(codes) == 1:
            code = next(iter(codes))
            unique_maps.append({"countyGeoid": geoid, "hudAreaCode": code, "areaId": f"hud-fmr:{code}"})
        else:
            ambiguous.append({"countyGeoid": geoid, "hudAreaCodes": sorted(codes)})

    areas = [areas_by_code[code] for code in sorted(areas_by_code)]
    return {
        "areas": areas,
        "countyMaps": unique_maps,
        "ambiguousCounties": ambiguous,
        "stats": {
            **stats,
            "parsedAreas": len(areas),
            "uniqueCountyMaps": len(unique_maps),
            "ambiguousCounties": len(ambiguous),
        },
    }


def split_county_tokens(rest: str) -> list[str]:
    rest = rest.strip()
    if not rest:
        return []
    rest = re.sub(r"^(Counties of FMR AREA within STATE|Components of FMR AREA within STATE|Towns within nonmetropolitan counties)\s*", "", rest, flags=re.I)
    parts = [p.strip() for p in rest.split(",") if p.strip()]
    return parts


def parse_bea_csv(zip_path: Path, inner: str, year: str = "2024") -> list[dict]:
    with zipfile.ZipFile(zip_path) as zf:
        text = zf.read(inner).decode("utf-8-sig")
    reader = csv.reader(io.StringIO(text))
    header = next(reader)
    year_i = header.index(year)
    out = []
    for row in reader:
        if len(row) <= year_i or not row[4]:
            continue
        line = int(row[4].strip())
        if line not in RPP_LINES:
            continue
        raw = row[year_i].strip()
        if raw in {"(NA)", "", "."}:
            continue
        out.append({
            "geoFips": row[0].strip().strip('"'),
            "name": row[1].strip().strip('"'),
            "category": RPP_LINES[line],
            "lineCode": line,
            "value": float(raw),
            "year": int(year),
        })
    return out


def load_acs_values(path: Path, wanted: set[str]) -> dict[str, dict]:
    out = {}
    with path.open() as f:
        header = next(f).strip().split("|")
        est_key, moe_key = header[1], header[2]
        table = "B19013" if "B19013" in est_key else "B01003"
        for line in f:
            geo_id, est_s, moe_s = line.strip().split("|")[:3]
            if geo_id not in wanted:
                continue
            est = int(est_s)
            moe = int(moe_s)
            record = {"estimate": None if est in CENSUS_SENTINELS else est, "moe": None if moe in CENSUS_SENTINELS else moe}
            out.setdefault(geo_id, {})[table] = record
    return out


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"wrote {path} ({path.stat().st_size} bytes)")


def main() -> None:
    counties = parse_counties(read_gazetteer(CACHE / "2024_Gaz_counties_national.zip"))
    places = parse_places(read_gazetteer(CACHE / "2024_Gaz_place_national.zip"))
    gazetteer_cbsas = parse_cbsas(read_gazetteer(CACHE / "2024_Gaz_cbsa_national.zip"))
    maps, counties_by_cbsa, states_by_cbsa, cbsa_meta = parse_delineation(xlsx_rows(CACHE / "list1_2023.xlsx"))
    principals = parse_principal_cities(xlsx_rows(CACHE / "list2_2023.xlsx"), places)

    metro_codes = {code for code, meta in cbsa_meta.items() if meta["metroKind"] == "metro"}
    principal_metros = [p for p in principals if p["metroKind"] == "metro"]
    indexed_places = []
    for p in principal_metros:
        gaz = places.get(p["placeGeoid"])
        if not gaz:
            continue
        indexed_places.append({**gaz, "principalOfCbsa": p["cbsaCode"]})

    cbsas = []
    for code in sorted(metro_codes):
        meta = cbsa_meta[code]
        states = sorted(states_by_cbsa[code])
        cbsas.append({
            "id": f"cbsa:{code}",
            "kind": "cbsa",
            "cbsaCode": code,
            "name": meta["title"],
            "metroKind": "metro",
            "stateCodes": states,
            "multiState": len(states) > 1,
            "countyGeoids": counties_by_cbsa[code],
            "geographyVintage": "omb-2023-07-21",
        })

    states = [{
        "id": f"state:{usps}",
        "kind": "state",
        "state": usps,
        "stateFips": fips,
        "name": USPS_TO_NAME[usps],
        "geographyVintage": "2024",
    } for fips, usps in sorted(STATE_FIPS_TO_USPS.items(), key=lambda kv: kv[1])]

    hud_by_year = {}
    for fy, fname, published, effective_from, effective_to, revision in [
        (2026, "FY26_FMRs_revised.xlsx", "2026-05-21", "2025-10-01", "2026-09-30", "revised-2026-05-21"),
        (2027, "FY27_FMRs.xlsx", "2026-09-01", "2026-10-01", "2027-09-30", "original"),
    ]:
        parsed = parse_hud_xlsx(CACHE / fname, fy)
        hud_by_year[fy] = {
            "schemaVersion": "1.0.0",
            "fiscalYear": fy,
            "areas": parsed["areas"],
            "countyMaps": parsed["countyMaps"],
            "ambiguousCounties": parsed["ambiguousCounties"],
            "publishedAt": f"{published}T00:00:00.000Z",
            "effectiveFrom": effective_from,
            "effectiveTo": effective_to,
            "revisionId": revision,
            "sourceFile": fname,
            "sourceUrl": f"https://www.huduser.gov/portal/datasets/fmr/fmr{fy}/{fname}",
            "provider": "U.S. Department of Housing and Urban Development",
            "semantics": "HUD Fair Market Rent is a 40th-percentile gross-rent benchmark, including shelter rent and most tenant-paid utilities.",
        }
        print(f"HUD FY{fy}: {parsed['stats']}")

    wanted = set()
    for st in states:
        wanted.add(f"0400000US{st['stateFips']}")
    for county in counties:
        wanted.add(f"0500000US{county['geoid']}")
    for place in indexed_places:
        wanted.add(f"1600000US{place['geoid']}")
    for cbsa in cbsas:
        wanted.add(f"310M700US{cbsa['cbsaCode']}")

    income = load_acs_values(CACHE / "acsdt5y2024-b19013.dat", wanted)
    pop = load_acs_values(CACHE / "acsdt5y2024-b01003.dat", wanted)
    acs_rows = []
    for geo_id in sorted(wanted):
        inc = income.get(geo_id, {}).get("B19013")
        p = pop.get(geo_id, {}).get("B01003")
        if not inc and not p:
            continue
        kind = "state" if geo_id.startswith("040") else "county" if geo_id.startswith("050") else "place" if geo_id.startswith("160") else "cbsa"
        acs_rows.append({
            "geoId": geo_id,
            "kind": kind,
            "population": None if not p else p["estimate"],
            "populationMoe": None if not p else p["moe"],
            "medianHouseholdIncome": None if not inc else inc["estimate"],
            "medianHouseholdIncomeMoe": None if not inc else inc["moe"],
        })

    state_rpp = parse_bea_csv(CACHE / "SARPP.zip", "SARPP_STATE_2008_2024.csv")
    metro_rpp = parse_bea_csv(CACHE / "MARPP.zip", "MARPP_MSA_2008_2024.csv")

    usda = {
        "reportMonth": "2026-07",
        "sourceUrl": "https://www.fns.usda.gov/cnpp/usda-food-plans-cost-food-monthly-reports",
        "plans": {
            "thrifty": {
                "child_1": 114.5, "child_2_3": 172.9, "child_4_5": 188.6, "child_6_8": 209.6, "child_9_11": 242.2,
                "female_12_13": 224.4, "female_14_19": 260.5, "female_20_50": 253.9, "female_51_70": 236.5, "female_71": 260.9,
                "male_12_13": 258.9, "male_14_19": 326.7, "male_20_50": 319.2, "male_51_70": 281.4, "male_71": 268.5,
            },
            "low-cost": {
                "child_1": 165.8, "child_2_3": 173.8, "child_4_5": 179.3, "child_6_8": 262.8, "child_9_11": 271.6,
                "female_12_13": 269.6, "female_14_19": 271.1, "female_20_50": 276.1, "female_51_70": 269.0, "female_71": 268.8,
                "male_12_13": 316.8, "male_14_19": 322.1, "male_20_50": 317.4, "male_51_70": 299.5, "male_71": 296.9,
            },
            "moderate-cost": {
                "child_1": 186.7, "child_2_3": 207.4, "child_4_5": 221.9, "child_6_8": 305.1, "child_9_11": 350.2,
                "female_12_13": 322.2, "female_14_19": 324.6, "female_20_50": 337.1, "female_51_70": 331.4, "female_71": 330.8,
                "male_12_13": 392.5, "male_14_19": 403.7, "male_20_50": 398.7, "male_51_70": 375.0, "male_71": 364.7,
            },
            "liberal": {
                "child_1": 226.8, "child_2_3": 252.6, "child_4_5": 268.3, "child_6_8": 357.0, "child_9_11": 408.2,
                "female_12_13": 401.5, "female_14_19": 400.6, "female_20_50": 430.2, "female_51_70": 399.7, "female_71": 395.4,
                "male_12_13": 460.9, "male_14_19": 474.7, "male_20_50": 487.5, "male_51_70": 449.3, "male_71": 449.0,
            },
        },
        "householdSizeAdjustment": {
            "1": 1.20, "2": 1.10, "3": 1.05, "4": 1.00, "5": 0.95, "6": 0.95, "7plus": 0.90,
        },
        "alaskaHawaii": {
            "thriftyReferenceFamily": {"anchorage": 1276.3, "hawaii": 1555.7, "contiguous": 1024.9},
            "note": "Official Alaska/Hawaii costs are published for the Thrifty Food Plan reference family only.",
        },
    }

    geography = {
        "schemaVersion": "1.0.0",
        "snapshotId": "census-omb-geography-2024-v1",
        "censusGeographyVintage": "2024",
        "ombDelineation": "2023-07-21",
        "ombBulletin": "23-01",
        "provider": "U.S. Census Bureau / OMB",
        "states": states,
        "counties": counties,
        "cbsas": cbsas,
        "places": indexed_places,
        "countyToCbsa": maps,
        "principalCities": principal_metros,
    }

    fetched = "2026-09-03T00:00:00.000Z"
    acs = {
        "schemaVersion": "1.0.0",
        "snapshotId": "census-acs5-2024-v1",
        "release": "ACS 5-Year 2024",
        "surveyYears": "2020-2024",
        "observationPeriod": "2024",
        "variables": {
            "B01003_001": {"label": "Total population", "universe": "Total population"},
            "B19013_001": {"label": "Median household income (2024 inflation-adjusted dollars)", "universe": "Households"},
        },
        "rows": acs_rows,
        "sourceUrl": "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/",
        "provider": "U.S. Census Bureau",
    }

    bea = {
        "schemaVersion": "1.0.0",
        "snapshotId": "bea-rpp-2024-v1",
        "observationPeriod": "2024",
        "referenceYear": 2024,
        "publishedAt": "2026-02-19T00:00:00.000Z",
        "categories": ["allItems", "goods", "housingRents", "utilities", "otherServices"],
        "national": 100,
        "states": [row for row in state_rpp if len(row["geoFips"]) == 5 and row["geoFips"] not in {"00000", "00998"}],
        "metros": [row for row in metro_rpp if row["geoFips"] not in {"00000", "00999"}],
        "nonmetroUs": [row for row in metro_rpp if row["geoFips"] == "00999"],
        "sourceUrl": "https://apps.bea.gov/regional/zip/SARPP.zip",
        "metroSourceUrl": "https://apps.bea.gov/regional/zip/MARPP.zip",
        "provider": "U.S. Bureau of Economic Analysis",
        "notInflation": True,
    }

    out_dir = CACHE / "normalized"
    write_json(out_dir / "geography.json", geography)
    write_json(out_dir / "acs.json", acs)
    write_json(out_dir / "bea-rpp.json", bea)
    write_json(out_dir / "usda-food.json", usda)
    for fy, payload in hud_by_year.items():
        write_json(out_dir / f"hud-fmr-fy{fy}.json", payload)

    print("places indexed", len(indexed_places), "cbsas", len(cbsas), "counties", len(counties), "acs rows", len(acs_rows))


if __name__ == "__main__":
    main()
