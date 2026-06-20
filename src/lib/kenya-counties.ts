// All 47 Kenyan counties with a curated list of sub-counties.
// Source: Kenya National Bureau of Statistics (KNBS) administrative units.

export interface KenyaCounty {
  name: string;
  subCounties: string[];
}

export const KENYA_COUNTIES: KenyaCounty[] = [
  { name: "Baringo", subCounties: ["Baringo Central", "Baringo North", "Baringo South", "Eldama Ravine", "Mogotio", "Tiaty"] },
  { name: "Bomet", subCounties: ["Bomet Central", "Bomet East", "Chepalungu", "Konoin", "Sotik"] },
  { name: "Bungoma", subCounties: ["Bumula", "Kabuchai", "Kanduyi", "Kimilil East", "Kimilil West", "Mt Elgon", "Sirisia", "Tongaren", "Webuye East", "Webuye West"] },
  { name: "Busia", subCounties: ["Budalangi", "Butula", "Funyula", "Matayos", "Nambale", "Teso North", "Teso South"] },
  { name: "Elgeyo Marakwet", subCounties: ["Keiyo North", "Keiyo South", "Marakwet East", "Marakwet West"] },
  { name: "Embu", subCounties: ["Manyatta", "Mbeere North", "Mbeere South", "Runyenjes"] },
  { name: "Garissa", subCounties: ["Balambala", "Dadaab", "Fafi", "Garissa Township", "Hulugho", "Ijara", "Lagdera"] },
  { name: "Homa Bay", subCounties: ["Homa Bay Town", "Kabondo Kasipul", "Karachwonyo", "Kasipul", "Mbita", "Ndhiwa", "Rangwe", "Suba"] },
  { name: "Isiolo", subCounties: ["Garba Tula", "Isiolo North", "Isiolo South", "Merti"] },
  { name: "Kajiado", subCounties: ["Isinya", "Kajiado Central", "Kajiado East", "Kajiado North", "Kajiado South", "Kajiado West", "Loitokitok", "Mashuuru"] },
  { name: "Kakamega", subCounties: ["Butere", "Kakamega Central", "Kakamega East", "Kakamega North", "Kakamega South", "Khwisero", "Lugari", "Lukuyani", "Matete", "Mumias East", "Mumias West", "Navakholo", "Shinyalu"] },
  { name: "Kericho", subCounties: ["Ainamoi", "Belgut", "Bureti", "Kericho East", "Kipkelion East", "Kipkelion West", "Soin Sigowet"] },
  { name: "Kiambu", subCounties: ["Gatundu North", "Gatundu South", "Githunguri", "Juja", "Kabete", "Kiambaa", "Kiambu Town", "Kikuyu", "Lari", "Limuru", "Ruiru", "Thika Town"] },
  { name: "Kilifi", subCounties: ["Chonyi", "Ganze", "Kaloleni", "Kauma", "Kilifi North", "Kilifi South", "Magarini", "Malindi", "Rabai"] },
  { name: "Kirinyaga", subCounties: ["Gichugu", "Kirinyaga Central", "Mwea East", "Mwea West", "Ndia"] },
  { name: "Kisii", subCounties: ["Bobasi", "Bomachoge Borabu", "Bomachoge Chache", "Kitutu Chache North", "Kitutu Chache South", "Nyaribari Chache", "Nyaribari Masaba", "South Mugirango"] },
  { name: "Kisumu", subCounties: ["Kisumu Central", "Kisumu East", "Kisumu West", "Muhoroni", "Nyakach", "Nyando", "Seme"] },
  { name: "Kitui", subCounties: ["Ikutha", "Katulani", "Kisasi", "Kitui Central", "Kitui East", "Kitui Rural", "Kitui South", "Kitui West", "Lower Yatta", "Matuu", "Mwingi Central", "Mwingi East", "Mwingi West", "Nzambani", "Thagicu"] },
  { name: "Kwale", subCounties: ["Kinango", "Lunga Lunga", "Matuga", "Msambweni", "Samburu"] },
  { name: "Laikipia", subCounties: ["Laikipia Central", "Laikipia East", "Laikipia North", "Laikipia West", "Nyahururu"] },
  { name: "Lamu", subCounties: ["Lamu East", "Lamu West"] },
  { name: "Machakos", subCounties: ["Athi River", "Kalama", "Kangundo", "Kathiani", "Machakos Town", "Masinga", "Matungulu", "Mwala", "Yatta"] },
  { name: "Makueni", subCounties: ["Kaiti", "Kibwezi East", "Kibwezi West", "Kilome", "Makueni", "Mbooni"] },
  { name: "Mandera", subCounties: ["Banissa", "Lafey", "Mandera East", "Mandera North", "Mandera South", "Mandera West"] },
  { name: "Marsabit", subCounties: ["Laisamis", "Moyale", "North Horr", "Saku", "Sololo"] },
  { name: "Meru", subCounties: ["Buuri", "Central Imenti", "Igembe Central", "Igembe North", "Igembe South", "Meru South", "North Imenti", "South Imenti", "Tigania East", "Tigania West"] },
  { name: "Migori", subCounties: ["Awendo", "Kuria East", "Kuria West", "Mabera", "Ntimaru", "Rongo", "Suna East", "Suna West", "Uriri"] },
  { name: "Mombasa", subCounties: ["Changamwe", "Jomvu", "Kisauni", "Likoni", "Mvita", "Nyali"] },
  { name: "Murang'a", subCounties: ["Gatanga", "Kahuro", "Kandara", "Kangema", "Kigumo", "Kiharu", "Mathioya", "Murang'a South"] },
  { name: "Nairobi", subCounties: ["Dagoretti North", "Dagoretti South", "Embakasi Central", "Embakasi East", "Embakasi North", "Embakasi South", "Embakasi West", "Kamukunji", "Kasarani", "Kibra", "Lang'ata", "Makadara", "Mathare", "Roysambu", "Ruaraka", "Starehe", "Westlands"] },
  { name: "Nakuru", subCounties: ["Bahati", "Gilgil", "Kuresoi North", "Kuresoi South", "Molo", "Naivasha", "Nakuru Town East", "Nakuru Town West", "Njoro", "Rongai", "Subukia"] },
  { name: "Nandi", subCounties: ["Aldai", "Chesumei", "Emgwen", "Mosop", "Nandi Hills", "Tindiret"] },
  { name: "Narok", subCounties: ["Narok East", "Narok North", "Narok South", "Narok West", "Transmara East", "Transmara West"] },
  { name: "Nyamira", subCounties: ["Borabu", "Manga", "Masaba North", "Nyamira North", "Nyamira South"] },
  { name: "Nyandarua", subCounties: ["Kinangop", "Kipipiri", "Ndaragwa", "Ol Joro Orok", "Ol Kalou"] },
  { name: "Nyeri", subCounties: ["Kieni East", "Kieni West", "Mathira East", "Mathira West", "Mukurweini", "Nyeri Town", "Othaya", "Tetu"] },
  { name: "Samburu", subCounties: ["Samburu Central", "Samburu East", "Samburu North"] },
  { name: "Siaya", subCounties: ["Alego Usonga", "Bondo", "Gem", "Rarieda", "Ugenya", "Ugunja"] },
  { name: "Taita Taveta", subCounties: ["Mwatate", "Taveta", "Voi", "Wundanyi"] },
  { name: "Tana River", subCounties: ["Bura", "Galole", "Garsen"] },
  { name: "Tharaka Nithi", subCounties: ["Chuka", "Igambang'ombe", "Maara", "Muthambi", "Tharaka North", "Tharaka South"] },
  { name: "Trans Nzoia", subCounties: ["Cherangany", "Endebess", "Kiminini", "Kwanza", "Saboti"] },
  { name: "Turkana", subCounties: ["Central", "East", "Kibish", "Loima", "North", "South", "West"] },
  { name: "Uasin Gishu", subCounties: ["Ainabkoi", "Kapseret", "Kesses", "Moiben", "Soy", "Turbo"] },
  { name: "Vihiga", subCounties: ["Emuhaya", "Hamisi", "Luanda", "Sabatia", "Vihiga"] },
  { name: "Wajir", subCounties: ["Eldas", "Tarbaj", "Wajir East", "Wajir North", "Wajir South", "Wajir West"] },
  { name: "West Pokot", subCounties: ["Central Pokot", "North Pokot", "Pokot South", "West Pokot"] },
];

export const COUNTY_NAMES: string[] = KENYA_COUNTIES.map((c) => c.name);
