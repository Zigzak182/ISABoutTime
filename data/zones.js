/* ============================================================
   Seed — ZIP prefix → planting region lookup
   ------------------------------------------------------------
   Resolves a US ZIP code to an approximate USDA plant hardiness
   zone, a planting region, and a moisture regime, using the
   first three digits (the USPS sectional center facility).

   ACCURACY NOTE — read this before relying on a result.
   A ZIP3 covers a wide area. Elevation, urban heat island,
   large water bodies and cold-air drainage all shift the real
   zone by a half zone or more, and soil pH is not predictable
   from a ZIP at all. Treat the output as a starting filter for
   a species list, then confirm with a site visit and a soil
   test before anything goes in the ground.

   RECORD: [lo, hi, state, region, zone, rain, city]
     lo/hi  inclusive ZIP3 range
     zone   approximate USDA zone label (2023 map)
     rain   'arid' | 'semiarid' | 'moderate' | 'humid'
     city   representative locality, shown back to the user
   ============================================================ */

window.SEED_ZONES = {

  regions: {
    ne:   { name: "Northeast",          note: "Cold winters, reliable summer rain, heavy road salt. Salt tolerance and cold hardiness drive the list." },
    ma:   { name: "Mid-Atlantic",       note: "Long growing season, humid summers, heavy clay and construction fill. Watch soil pH on new-build lots." },
    se:   { name: "Southeast",          note: "Hot humid summers, acid soils, ice storms. Disease resistance and wood strength matter most." },
    gulf: { name: "Gulf Coast",         note: "Hurricane wind loading is the dominant design factor. Specify proven wind-resistant species." },
    fl:   { name: "Florida / Subtropical", note: "Hurricanes, sandy low-nutrient soil, salt spray, and a distinct subtropical palette." },
    mw:   { name: "Midwest",            note: "Cold winters, wet springs, alkaline glacial till in many areas. Chlorosis is the classic failure mode." },
    gp:   { name: "Great Plains",       note: "Wind, drought, alkaline soils, wide temperature swings. Toughness beats ornament." },
    mtn:  { name: "Mountain West",      note: "High elevation, intense sun, alkaline soil, low humidity. Very few species truly thrive." },
    sw:   { name: "Desert Southwest",   note: "Extreme heat, alkaline caliche soils, minimal rain. Low-water natives and proven heat performers only." },
    pnw:  { name: "Pacific Northwest",  note: "Wet mild winters, dry summers. Summer drought tolerance matters more than most people expect." },
    ca:   { name: "California",         note: "Mediterranean climate, summer drought, fire risk and water restriction. Low-water and fire-wise selection." }
  },

  /* Zone label → numeric value for comparison. 6a = 6.0, 6b = 6.5 */
  zoneValue: function (label) {
    var m = String(label).match(/^(\d+)([ab])?$/);
    if (!m) return null;
    return parseInt(m[1], 10) + (m[2] === "b" ? 0.5 : 0);
  },

  ranges: [
    /* ---- NEW ENGLAND ---- */
    [ "010","013","MA","ne","6a","humid","Springfield / Berkshires" ],
    [ "014","019","MA","ne","6a","humid","Worcester / Northeast MA" ],
    [ "020","024","MA","ne","6b","humid","Greater Boston" ],
    [ "025","027","MA","ne","7a","humid","Cape Cod / South Coast" ],
    [ "028","029","RI","ne","7a","humid","Providence / Rhode Island" ],
    [ "030","032","NH","ne","6a","humid","Manchester / Southern NH" ],
    [ "033","035","NH","ne","5b","humid","Concord / Central NH" ],
    [ "036","038","NH","ne","5a","humid","Northern New Hampshire" ],
    [ "039","040","ME","ne","6a","humid","Portland / Southern Maine" ],
    [ "041","044","ME","ne","5b","humid","Augusta / Midcoast Maine" ],
    [ "045","047","ME","ne","5a","humid","Central Maine" ],
    [ "048","049","ME","ne","4b","humid","Northern Maine" ],
    [ "050","052","VT","ne","5b","humid","Southern Vermont" ],
    [ "053","056","VT","ne","5a","humid","Burlington / Central Vermont" ],
    [ "057","059","VT","ne","4b","humid","Northeast Kingdom" ],
    [ "060","063","CT","ne","6b","humid","Hartford / Central Connecticut" ],
    [ "064","065","CT","ne","7a","humid","New London / Shoreline" ],
    [ "066","069","CT","ne","7a","humid","Bridgeport / Stamford" ],

    /* ---- NEW YORK & NEW JERSEY ---- */
    [ "070","076","NJ","ma","6b","humid","Newark / North Jersey" ],
    [ "077","079","NJ","ma","7a","humid","Monmouth / Jersey Shore" ],
    [ "080","085","NJ","ma","7a","humid","Trenton / Central Jersey" ],
    [ "086","089","NJ","ma","7b","humid","South Jersey" ],
    [ "100","104","NY","ne","7b","humid","New York City" ],
    [ "105","109","NY","ne","7a","humid","Westchester / Lower Hudson" ],
    [ "110","119","NY","ne","7b","humid","Long Island" ],
    [ "120","129","NY","ne","5b","humid","Albany / Catskills" ],
    [ "130","139","NY","ne","5b","humid","Syracuse / Binghamton" ],
    [ "140","149","NY","ne","6a","humid","Buffalo / Rochester" ],

    /* ---- PENNSYLVANIA / DELMARVA / DC ---- */
    [ "150","156","PA","ma","6b","humid","Pittsburgh" ],
    [ "157","168","PA","ma","6a","humid","Central Pennsylvania" ],
    [ "169","178","PA","ma","6b","humid","Harrisburg / Williamsport" ],
    [ "179","189","PA","ma","7a","humid","Allentown / Philadelphia suburbs" ],
    [ "190","191","PA","ma","7b","humid","Philadelphia" ],
    [ "193","196","PA","ma","7a","humid","Chester / Lancaster County" ],
    [ "197","199","DE","ma","7b","humid","Wilmington / Delaware" ],
    [ "200","205","DC","ma","7b","humid","Washington, DC" ],
    [ "206","214","MD","ma","7b","humid","Baltimore / Annapolis / Suburban MD" ],
    [ "215","217","MD","ma","6b","humid","Western Maryland" ],
    [ "218","219","MD","ma","7b","humid","Eastern Shore / Salisbury" ],

    /* ---- VIRGINIA / WEST VIRGINIA ---- */
    [ "220","223","VA","ma","7b","humid","Northern Virginia" ],
    [ "224","229","VA","ma","7a","humid","Charlottesville / Fredericksburg" ],
    [ "230","239","VA","ma","8a","humid","Richmond / Hampton Roads" ],
    [ "240","241","VA","ma","7a","humid","Roanoke" ],
    [ "242","246","VA","ma","6b","humid","Southwest Virginia" ],
    [ "247","253","WV","ma","6b","humid","Bluefield / Charleston WV" ],
    [ "254","268","WV","ma","6a","humid","Martinsburg / Northern WV" ],

    /* ---- CAROLINAS / GEORGIA ---- */
    [ "270","279","NC","se","7b","humid","Greensboro / Raleigh-Durham" ],
    [ "280","285","NC","se","8a","humid","Charlotte / Fayetteville / Wilmington" ],
    [ "286","289","NC","se","7a","humid","Asheville / Western NC" ],
    [ "290","296","SC","se","8a","humid","Columbia / Greenville" ],
    [ "297","299","SC","se","8b","humid","Charleston / Myrtle Beach" ],
    [ "300","303","GA","se","8a","humid","Atlanta Metro" ],
    [ "304","306","GA","se","7b","humid","North Georgia" ],
    [ "307","309","GA","se","8a","humid","Augusta / Northeast Georgia" ],
    [ "310","312","GA","se","8b","humid","Macon / Savannah" ],
    [ "313","319","GA","se","8b","humid","Albany / Valdosta" ],
    [ "398","399","GA","se","8a","humid","Columbus / West Georgia" ],

    /* ---- FLORIDA ---- */
    [ "320","326","FL","fl","9a","humid","Jacksonville / Gainesville" ],
    [ "327","329","FL","fl","9b","humid","Orlando / Daytona" ],
    [ "330","334","FL","fl","10b","humid","Miami / Fort Lauderdale / Palm Beach" ],
    [ "335","339","FL","fl","10a","humid","Tampa / St. Petersburg" ],
    [ "341","342","FL","fl","10a","humid","Naples / Fort Myers" ],
    [ "344","349","FL","fl","10a","humid","Central & South Florida" ],

    /* ---- ALABAMA / TENNESSEE / MISSISSIPPI ---- */
    [ "350","356","AL","se","8a","humid","Birmingham / Tuscaloosa" ],
    [ "357","359","AL","se","7b","humid","Huntsville / North Alabama" ],
    [ "360","364","AL","se","8b","humid","Montgomery / Auburn" ],
    [ "365","369","AL","gulf","9a","humid","Mobile / Gulf Shores" ],
    [ "370","374","TN","se","7b","humid","Nashville / Chattanooga" ],
    [ "375","379","TN","se","7a","humid","Knoxville / Tri-Cities" ],
    [ "380","385","TN","se","8a","humid","Memphis / West Tennessee" ],
    [ "386","392","MS","se","8b","humid","Greenville / Jackson MS" ],
    [ "393","395","MS","se","8b","humid","Meridian / Hattiesburg" ],
    [ "396","397","MS","gulf","9a","humid","Gulfport / Biloxi" ],

    /* ---- KENTUCKY / OHIO VALLEY ---- */
    [ "400","406","KY","se","7a","humid","Louisville / Lexington" ],
    [ "407","418","KY","se","6b","humid","Eastern Kentucky" ],
    [ "420","427","KY","se","7a","humid","Paducah / Western Kentucky" ],
    [ "430","433","OH","mw","6b","humid","Columbus" ],
    [ "434","436","OH","mw","6a","humid","Toledo" ],
    [ "437","439","OH","mw","6b","humid","Zanesville / Southeast Ohio" ],
    [ "440","449","OH","mw","6b","humid","Cleveland / Akron / Youngstown" ],
    [ "450","459","OH","mw","6b","humid","Cincinnati / Dayton" ],
    [ "460","469","IN","mw","6a","humid","Indianapolis / North Indiana" ],
    [ "470","479","IN","mw","6b","humid","Southern Indiana / Evansville" ],
    [ "480","489","MI","mw","6a","humid","Detroit / Flint / Saginaw" ],
    [ "490","495","MI","mw","6a","humid","Grand Rapids / Kalamazoo" ],
    [ "496","499","MI","mw","5a","humid","Northern Michigan / Upper Peninsula" ],

    /* ---- UPPER MIDWEST ---- */
    [ "500","516","IA","mw","5b","moderate","Des Moines / Central Iowa" ],
    [ "520","528","IA","mw","5b","moderate","Cedar Rapids / Davenport" ],
    [ "530","537","WI","mw","5b","humid","Milwaukee / Madison" ],
    [ "538","545","WI","mw","5a","humid","La Crosse / Central Wisconsin" ],
    [ "546","549","WI","mw","4b","humid","Northern Wisconsin" ],
    [ "550","555","MN","mw","5a","moderate","Minneapolis–St. Paul" ],
    [ "556","558","MN","mw","4a","moderate","Duluth / Northern Minnesota" ],
    [ "559","567","MN","mw","4b","moderate","Rochester / Southern Minnesota" ],
    [ "570","577","SD","gp","4b","semiarid","Sioux Falls / Rapid City" ],
    [ "580","588","ND","gp","4a","semiarid","Fargo / Bismarck" ],
    [ "590","599","MT","mtn","4a","semiarid","Billings / Missoula" ],

    /* ---- ILLINOIS / MISSOURI / PLAINS ---- */
    [ "600","609","IL","mw","6a","humid","Chicago Metro" ],
    [ "610","619","IL","mw","5b","humid","Rockford / Peoria / Champaign" ],
    [ "620","629","IL","mw","6b","humid","Springfield / Metro East" ],
    [ "630","639","MO","mw","6b","humid","St. Louis" ],
    [ "640","641","MO","mw","6b","moderate","Kansas City MO" ],
    [ "644","658","MO","mw","6b","moderate","Columbia / Springfield MO" ],
    [ "660","662","KS","gp","6b","moderate","Kansas City KS / Topeka" ],
    [ "664","669","KS","gp","6a","semiarid","Northeast & Central Kansas" ],
    [ "670","679","KS","gp","7a","semiarid","Wichita / Western Kansas" ],
    [ "680","693","NE","gp","5b","semiarid","Omaha / Lincoln / Central Nebraska" ],

    /* ---- SOUTH CENTRAL ---- */
    [ "700","701","LA","gulf","9b","humid","New Orleans" ],
    [ "703","708","LA","gulf","9a","humid","Baton Rouge / Lafayette" ],
    [ "710","714","LA","se","8b","humid","Shreveport / Monroe" ],
    [ "716","722","AR","se","8a","humid","Little Rock / Hot Springs" ],
    [ "723","729","AR","se","7a","humid","Fayetteville / North Arkansas" ],
    [ "730","731","OK","gp","7b","semiarid","Oklahoma City" ],
    [ "734","741","OK","gp","7a","moderate","Tulsa / Northeast Oklahoma" ],
    [ "743","749","OK","gp","7b","semiarid","Lawton / Southern Oklahoma" ],

    /* ---- TEXAS ---- */
    [ "750","753","TX","gp","8a","moderate","Dallas Metroplex" ],
    [ "754","759","TX","se","8a","humid","Tyler / East Texas" ],
    [ "760","761","TX","gp","8a","moderate","Fort Worth / Arlington" ],
    [ "762","769","TX","gp","8a","semiarid","Waco / Abilene / Central Texas" ],
    [ "770","775","TX","gulf","9a","humid","Houston Metro" ],
    [ "776","779","TX","gulf","9a","humid","Beaumont / Victoria" ],
    [ "780","784","TX","sw","9a","semiarid","San Antonio / Corpus Christi" ],
    [ "785","785","TX","gulf","10a","semiarid","McAllen / Rio Grande Valley" ],
    [ "786","789","TX","sw","8b","semiarid","Austin / Hill Country" ],
    [ "790","791","TX","gp","7a","semiarid","Amarillo / Panhandle" ],
    [ "792","793","TX","gp","7b","semiarid","Lubbock / Wichita Falls" ],
    [ "794","797","TX","sw","8a","arid","Midland / Odessa / San Angelo" ],
    [ "798","799","TX","sw","8a","arid","El Paso" ],
    [ "885","885","TX","sw","8a","arid","El Paso" ],

    /* ---- MOUNTAIN WEST ---- */
    [ "800","802","CO","mtn","6a","semiarid","Denver Metro" ],
    [ "803","805","CO","mtn","5b","semiarid","Boulder / Fort Collins / Greeley" ],
    [ "806","809","CO","mtn","6a","semiarid","Colorado Springs / Pueblo" ],
    [ "810","811","CO","mtn","6a","semiarid","Southeast Colorado" ],
    [ "812","813","CO","mtn","5a","semiarid","San Luis Valley / Durango" ],
    [ "814","816","CO","mtn","6a","semiarid","Grand Junction / Western Slope" ],
    [ "820","831","WY","mtn","4b","semiarid","Cheyenne / Casper / Wyoming" ],
    [ "832","834","ID","mtn","5a","semiarid","Idaho Falls / Pocatello" ],
    [ "835","838","ID","mtn","7a","semiarid","Boise / Coeur d'Alene" ],
    [ "840","841","UT","mtn","7a","arid","Salt Lake City" ],
    [ "843","844","UT","mtn","6a","arid","Ogden / Logan" ],
    [ "845","846","UT","mtn","6b","arid","Provo / Central Utah" ],
    [ "847","847","UT","sw","8b","arid","St. George" ],
    [ "889","891","NV","sw","9a","arid","Las Vegas" ],
    [ "893","895","NV","mtn","7a","arid","Reno / Elko" ],
    [ "897","898","NV","mtn","7a","arid","Carson City / Northern Nevada" ],

    /* ---- SOUTHWEST ---- */
    [ "850","853","AZ","sw","9b","arid","Phoenix Metro" ],
    [ "855","857","AZ","sw","9a","arid","Tucson / Southern Arizona" ],
    [ "859","860","AZ","mtn","6a","semiarid","Flagstaff / High Country" ],
    [ "863","865","AZ","sw","8a","arid","Prescott / Kingman" ],
    [ "870","871","NM","sw","7b","arid","Albuquerque" ],
    [ "873","875","NM","sw","7a","arid","Gallup / Northwest New Mexico" ],
    [ "877","878","NM","mtn","6b","semiarid","Santa Fe / Northern New Mexico" ],
    [ "879","884","NM","sw","8a","arid","Las Cruces / Roswell" ],

    /* ---- CALIFORNIA ---- */
    [ "900","908","CA","ca","10a","semiarid","Los Angeles" ],
    [ "910","918","CA","ca","10a","semiarid","Pasadena / San Gabriel Valley" ],
    [ "919","921","CA","ca","10a","semiarid","San Diego" ],
    [ "922","922","CA","sw","9b","arid","Palm Springs / Coachella Valley" ],
    [ "923","925","CA","ca","9b","arid","Riverside / San Bernardino" ],
    [ "926","928","CA","ca","10a","semiarid","Orange County" ],
    [ "930","931","CA","ca","10a","semiarid","Ventura / Santa Barbara" ],
    [ "932","933","CA","ca","9a","arid","Bakersfield" ],
    [ "934","935","CA","ca","10a","semiarid","San Luis Obispo / Central Coast" ],
    [ "936","939","CA","ca","9a","semiarid","Fresno / Salinas" ],
    [ "940","941","CA","ca","10a","semiarid","San Francisco" ],
    [ "942","943","CA","ca","9b","semiarid","Sacramento / Palo Alto" ],
    [ "944","945","CA","ca","10a","semiarid","San Mateo / Hayward" ],
    [ "946","948","CA","ca","9b","semiarid","Oakland / Berkeley / Richmond" ],
    [ "949","951","CA","ca","9b","semiarid","Marin / San Jose" ],
    [ "952","953","CA","ca","9b","semiarid","Stockton / Modesto" ],
    [ "954","955","CA","ca","9a","moderate","Santa Rosa / Eureka" ],
    [ "956","958","CA","ca","9b","semiarid","Sacramento Metro" ],
    [ "959","960","CA","ca","9a","semiarid","Marysville / Redding" ],
    [ "961","961","CA","mtn","6b","semiarid","Lake Tahoe / Sierra" ],

    /* ---- PACIFIC NORTHWEST & NONCONTIGUOUS ---- */
    [ "970","972","OR","pnw","9a","moderate","Portland Metro" ],
    [ "973","974","OR","pnw","8b","moderate","Salem / Eugene" ],
    [ "975","975","OR","pnw","8b","semiarid","Medford / Rogue Valley" ],
    [ "976","979","OR","mtn","6b","semiarid","Bend / Klamath Falls / Pendleton" ],
    [ "980","982","WA","pnw","9a","moderate","Seattle / Everett" ],
    [ "983","986","WA","pnw","8b","moderate","Tacoma / Olympia / Vancouver WA" ],
    [ "988","989","WA","mtn","7a","arid","Wenatchee / Central Washington" ],
    [ "990","994","WA","mtn","7a","semiarid","Spokane / Yakima / Tri-Cities" ],
    [ "995","995","AK","pnw","5a","moderate","Anchorage" ],
    [ "996","997","AK","pnw","2b","moderate","Fairbanks / Interior Alaska" ],
    [ "998","999","AK","pnw","7a","humid","Juneau / Southeast Alaska" ],
    [ "967","968","HI","fl","12a","humid","Hawaii" ],
    [ "006","009","PR","fl","13a","humid","Puerto Rico / US Virgin Islands" ]
  ],

  /* Resolve a 5-digit (or 3-digit) ZIP to its record. */
  lookup: function (zip) {
    var z = String(zip || "").trim().replace(/[^0-9]/g, "");
    /* Accept a 3-digit prefix, a 5-digit ZIP, or a 9-digit ZIP+4. */
    if (z.length !== 3 && z.length !== 5 && z.length !== 9) return null;
    var p = z.slice(0, 3);
    for (var i = 0; i < this.ranges.length; i++) {
      var r = this.ranges[i];
      if (p >= r[0] && p <= r[1]) {
        return {
          zip: z, prefix: p, state: r[2], region: r[3], regionName: this.regions[r[3]].name,
          regionNote: this.regions[r[3]].note, zone: r[4], zoneValue: this.zoneValue(r[4]),
          rain: r[5], city: r[6]
        };
      }
    }
    return null;
  }
};
