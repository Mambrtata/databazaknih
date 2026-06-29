const INITIAL_BOOKS = [
  {
    "title": "Kniha bez názvu",
    "author": "Anonymus",
    "genre": "Svetová klasika"
  },
  {
    "title": "ZÁMOK OTRANTO / VATHEK",
    "author": "Beckford, William / Walpole, Horace",
    "genre": "Svetová klasika",
    "originalTitle": "The Castle of Otranto / Vathek"
  },
  {
    "title": "Don Quijote (I, II)",
    "author": "Cervantes, Miguel de",
    "genre": "Svetová klasika",
    "originalTitle": "Don Quixote"
  },
  {
    "title": "Šafran magonov",
    "author": "Dostojevskij, Fiodor (predpoklad)",
    "genre": "Svetová klasika"
  },
  {
    "title": "VYSOKÁ HRA",
    "author": "Dostojevskij, Fiodor (predpoklad)",
    "genre": "Svetová klasika"
  },
  {
    "title": "NÁJDUCH TOM JONES",
    "author": "Fielding, Henry",
    "genre": "Svetová klasika",
    "originalTitle": "Tom Jones"
  },
  {
    "title": "ZLATÉ MUŠKY",
    "author": "Golding, William",
    "genre": "Svetová klasika",
    "originalTitle": "Lord of the Flies"
  },
  {
    "title": "Dělníci moře",
    "author": "Hugo, Victor",
    "genre": "Svetová klasika",
    "originalTitle": "The Toilers of the Sea"
  },
  {
    "title": "CHRÁM MATKY BOŽEJ V PARÍŽI",
    "author": "Hugo, Victor",
    "genre": "Svetová klasika",
    "originalTitle": "The Hunchback of Notre-Dame"
  },
  {
    "title": "Životné prehry F. Makru",
    "author": "Mauriac, François (pravdepodobne)",
    "genre": "Svetová klasika"
  },
  {
    "title": "Colas Breugnon",
    "author": "Rolland, Romain",
    "genre": "Svetová klasika",
    "originalTitle": "Colas Breugnon"
  },
  {
    "title": "ÚNOS",
    "author": "Stevenson, Robert Louis",
    "genre": "Svetová klasika",
    "originalTitle": "Kidnapped"
  },
  {
    "title": "Ľudia z Hemšó / Sonáta príšer / Slečna Júlia",
    "author": "Strindberg, August",
    "genre": "Svetová klasika",
    "originalTitle": "The People of Hemsö / The Ghost Sonata / Miss Julie"
  },
  {
    "title": "ZLATÉ HUSLE",
    "author": "Beblavý, Pavel",
    "genre": "Slovenská a česká literatúra"
  },
  {
    "title": "SLÁVNOSŤ ŽÁB",
    "author": "Bukovčan, Ivan",
    "genre": "Slovenská a česká literatúra"
  },
  {
    "title": "(Neznámy titul)",
    "author": "Domasta, Ján",
    "genre": "Slovenská a česká literatúra"
  },
  {
    "title": "Šalviový vŕšok",
    "author": "Ďuríčková, Mária",
    "genre": "Slovenská a česká literatúra"
  },
  {
    "title": "PREŠPORSKÝ ZVON",
    "author": "Dvořák, Ladislav",
    "genre": "Slovenská a česká literatúra"
  },
  {
    "title": "ČUDNÝ PRÍPAD",
    "author": "Jaroš, Peter",
    "genre": "Slovenská a česká literatúra"
  },
  {
    "title": "Štvorylka",
    "author": "Jesenský, Janko",
    "genre": "Slovenská a česká literatúra"
  },
  {
    "title": "Reštaurácia",
    "author": "Kalinčiak, Ján",
    "genre": "Slovenská a česká literatúra"
  },
  {
    "title": "RASTLI LESY I",
    "author": "Kapolka, Belo",
    "genre": "Slovenská a česká literatúra"
  },
  {
    "title": "NA OKRAJI VEĽKOMESTA",
    "author": "Nádaši-Jégé, Ladislav",
    "genre": "Slovenská a česká literatúra"
  },
  {
    "title": "Dni dlhšie ako ľudský vek",
    "author": "Ajtmatov, Čingiz",
    "genre": "Spoločenské a psychologické romány",
    "originalTitle": "The Day Lasts More Than a Hundred Years"
  },
  {
    "title": "Riceymanove schody",
    "author": "Bennett, Arnold",
    "genre": "Spoločenské a psychologické romány",
    "originalTitle": "Riceyman Steps"
  },
  {
    "title": "BRÁNA SPÁSY",
    "author": "Cronin, Arlington Joseph",
    "genre": "Spoločenské a psychologické romány",
    "originalTitle": "The Citadel"
  },
  {
    "title": "Diplomati (2)",
    "author": "Dangulov, Savva",
    "genre": "Spoločenské a psychologické romány"
  },
  {
    "title": "VÁHY",
    "author": "DeLillo, Don",
    "genre": "Spoločenské a psychologické romány",
    "originalTitle": "Ratner's Star"
  },
  {
    "title": "John Peklo",
    "author": "Decoin, Didier",
    "genre": "Spoločenské a psychologické romány",
    "originalTitle": "John l'Enfer"
  },
  {
    "title": "Dedič",
    "author": "Delblanc, Sven",
    "genre": "Spoločenské a psychologické romány",
    "originalTitle": "The Heir"
  },
  {
    "title": "VÁBNA NEDZMA",
    "author": "Dubov, Nikolaj",
    "genre": "Spoločenské a psychologické romány"
  },
  {
    "title": "Bodamské jazero",
    "author": "Dygat",
    "genre": "Spoločenské a psychologické romány",
    "originalTitle": "Disneyland"
  },
  {
    "title": "Cesta ze tmy",
    "author": "Faith, Curtis M.",
    "genre": "Spoločenské a psychologické romány",
    "originalTitle": "The Way Out of the Dark"
  },
  {
    "title": "Odsúdenie plukovníka Montoyu",
    "author": "Gasulla, Luis",
    "genre": "Spoločenské a psychologické romány"
  },
  {
    "title": "POTREBNÝ ČLOVEK",
    "author": "Gončarov, Jurij",
    "genre": "Spoločenské a psychologické romány"
  },
  {
    "title": "Když strom zpívá",
    "author": "Haviaras, Stratos",
    "genre": "Spoločenské a psychologické romány",
    "originalTitle": "When the Tree Sings"
  },
  {
    "title": "Svet podľa Garpa",
    "author": "Irving, John",
    "genre": "Spoločenské a psychologické romány",
    "originalTitle": "The World According to Garp"
  },
  {
    "title": "Anatolan",
    "author": "Kazan, Elia",
    "genre": "Spoločenské a psychologické romány"
  },
  {
    "title": "Priateľstvo",
    "author": "Kopťajevová, A.",
    "genre": "Spoločenské a psychologické romány"
  },
  {
    "title": "Túžba",
    "author": "Kopťajevová, A.",
    "genre": "Spoločenské a psychologické romány"
  },
  {
    "title": "ŠKOLA NA HRANICI",
    "author": "Kosztolányi, Dezső",
    "genre": "Spoločenské a psychologické romány",
    "originalTitle": "Skylark"
  },
  {
    "title": "Diomo",
    "author": "Lewis, Norman",
    "genre": "Spoločenské a psychologické romány"
  },
  {
    "title": "Nahý život",
    "author": "Martini, Juan Carlos",
    "genre": "Spoločenské a psychologické romány"
  },
  {
    "title": "VILA TRISTE",
    "author": "Modiano, Patrick",
    "genre": "Spoločenské a psychologické romány",
    "originalTitle": "Villa Triste"
  },
  {
    "title": "Baiyun",
    "author": "Muschg, Adolf",
    "genre": "Spoločenské a psychologické romány",
    "originalTitle": "Baiyun"
  },
  {
    "title": "LODE ODCHÁDZAJÚ NA ÚSVITE",
    "author": "Nosov, Jevgenij",
    "genre": "Spoločenské a psychologické romány"
  },
  {
    "title": "Krstný otec",
    "author": "Puzo, Mario",
    "genre": "Spoločenské a psychologické romány",
    "originalTitle": "The Godfather"
  },
  {
    "title": "TEMNÁ ARÉNA",
    "author": "Puzo, Mario",
    "genre": "Spoločenské a psychologické romány",
    "originalTitle": "The Dark Arena"
  },
  {
    "title": "ŽENY V ÚDOLÍ RÝNA",
    "author": "Simmel, Johannes Mario",
    "genre": "Spoločenské a psychologické romány",
    "originalTitle": "Hurricane over the Rhine"
  },
  {
    "title": "VODOPÁD",
    "author": "Stiernstedtová, Marika",
    "genre": "Spoločenské a psychologické romány"
  },
  {
    "title": "Vezmi si ma",
    "author": "Updike, John",
    "genre": "Spoločenské a psychologické romány",
    "originalTitle": "Marry Me"
  },
  {
    "title": "Ohňostroj márnosti",
    "author": "Wolfe, Tom",
    "genre": "Spoločenské a psychologické romány",
    "originalTitle": "The Bonfire of the Vanities"
  },
  {
    "title": "Syn Luny",
    "author": "Amiredžibi, Čabua",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "Data Tutashkhia"
  },
  {
    "title": "Ohnivý anjel",
    "author": "Brjusov, Valerij",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "The Fiery Angel"
  },
  {
    "title": "Tajpan",
    "author": "Clavesll, James",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "Tai-Pan"
  },
  {
    "title": "Joseph Balsamo (2)",
    "author": "Dumas, Alexandre",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "Joseph Balsamo"
  },
  {
    "title": "KRÁĽOVNIN NÁHRDELNÍK",
    "author": "Dumas, Alexandre",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "The Queen's Necklace"
  },
  {
    "title": "NOVÝ GRÓF MONTE CRISTO",
    "author": "Dumas, Alexandre (originál)",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "The Count of Monte Cristo"
  },
  {
    "title": "Vikomt de Bragelonne (1, 2, 3)",
    "author": "Dumas, Alexandre",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "The Vicomte of Bragelonne"
  },
  {
    "title": "Hostinec Jamajka",
    "author": "du Maurier, Daphne",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "Jamaica Inn"
  },
  {
    "title": "(Neznámy titul)",
    "author": "Feuchtwanger, Lion",
    "genre": "Historické a dobrodružné romány"
  },
  {
    "title": "Goya",
    "author": "Feuchtwanger, Lion",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "Goya"
  },
  {
    "title": "ANGELIKA cesta do versailles",
    "author": "Golon, Anne",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "Angélique"
  },
  {
    "title": "Z Missouri do Oregonu",
    "author": "Guthrie Jr., A. B.",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "The Way West"
  },
  {
    "title": "MILOVANÝ AŽ NA POPRAVISKO",
    "author": "Jókai, Mór",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "Black Diamonds"
  },
  {
    "title": "Májovský KREJČA",
    "author": "Kaplický, Václav",
    "genre": "Historické a dobrodružné romány"
  },
  {
    "title": "Krvavý básnik Nero",
    "author": "Kosztolányi, Dezső",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "Nero, the Bloody Poet"
  },
  {
    "title": "CEZ DIVY KURDISTAN",
    "author": "May, Karl",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "Through the Land of the Kurds"
  },
  {
    "title": "ODVIATE VETROM",
    "author": "Mitchell, Margaret",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "Gone with the Wind"
  },
  {
    "title": "MANON",
    "author": "Mozojev, Boris",
    "genre": "Historické a dobrodružné romány"
  },
  {
    "title": "TIZIANOV SYN",
    "author": "Musset, Alfred de",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "The Son of Titian"
  },
  {
    "title": "Zamilovaný d'Artagnan",
    "author": "Nimier, Roger",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "D'Artagnan in Love"
  },
  {
    "title": "Doktor Živago",
    "author": "Pasternak, Boris",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "Doctor Zhivago"
  },
  {
    "title": "Rembrandt",
    "author": "Schmitt, Gladys",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "Rembrandt"
  },
  {
    "title": "KORZIČANKA",
    "author": "Schönthan, Gabi",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "The Corsican Woman"
  },
  {
    "title": "Večný Žid (1/2, 7/8)",
    "author": "Sue, Eugène",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "The Wandering Jew"
  },
  {
    "title": "Kamenní ľudia",
    "author": "Talev, Dimitar",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "The Iron Candlestick"
  },
  {
    "title": "HONBA ZA VETROM",
    "author": "Vázquez-Figueroa, Alberto",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "Chasing the Wind"
  },
  {
    "title": "Egypťan Sinuhe",
    "author": "Waltari, Mika",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "The Egyptian"
  },
  {
    "title": "Povesť o kláštore",
    "author": "Wasylewski, Stanisław",
    "genre": "Historické a dobrodružné romány"
  },
  {
    "title": "Večná ambra",
    "author": "Winsorová, K.",
    "genre": "Historické a dobrodružné romány",
    "originalTitle": "Forever Amber"
  },
  {
    "title": "TAJOMSTVO ŠPIONÁŽE",
    "author": "Borovička, V. P.",
    "genre": "Krimi, thrillery a špionážne romány"
  },
  {
    "title": "Stínohra",
    "author": "Collinsová, Sophie",
    "genre": "Krimi, thrillery a špionážne romány",
    "originalTitle": "Shadow Play"
  },
  {
    "title": "Vyslobodenie",
    "author": "Dickey, James",
    "genre": "Krimi, thrillery a špionážne romány",
    "originalTitle": "Deliverance"
  },
  {
    "title": "Šakal",
    "author": "Forsyth, Frederick",
    "genre": "Krimi, thrillery a špionážne romány",
    "originalTitle": "The Day of the Jackal"
  },
  {
    "title": "VRÁŤ SA, SMUTNÝ CHARLESTON",
    "author": "Himes, Chester",
    "genre": "Krimi, thrillery a špionážne romány",
    "originalTitle": "Come Back, Charleston Blue"
  },
  {
    "title": "Prekrásna noc",
    "author": "Irish, William (Cornell Woolrich)",
    "genre": "Krimi, thrillery a špionážne romány",
    "originalTitle": "Phantom Lady"
  },
  {
    "title": "OPERÁCIA TORTUGAS",
    "author": "Ludlum, Robert",
    "genre": "Krimi, thrillery a špionážne romány"
  },
  {
    "title": "Dvojnásobná smrť Frederica Belota a iné",
    "author": "MacLean, Alistair",
    "genre": "Krimi, thrillery a špionážne romány"
  },
  {
    "title": "INŠPEKTOR ALLEYN",
    "author": "Marshová, Ngaio",
    "genre": "Krimi, thrillery a špionážne romány",
    "originalTitle": "Inspector Alleyn"
  },
  {
    "title": "Sprisahanie Grálu",
    "author": "Moore, Joe / Sholesová, Lynn",
    "genre": "Krimi, thrillery a špionážne romány",
    "originalTitle": "The Grail Conspiracy"
  },
  {
    "title": "PROFESIONÁL",
    "author": "Robinson, Patrick",
    "genre": "Krimi, thrillery a špionážne romány"
  },
  {
    "title": "Dickicht",
    "author": "Smith, Scott",
    "genre": "Krimi, thrillery a špionážne romány",
    "originalTitle": "A Simple Plan"
  },
  {
    "title": "Přízrak",
    "author": "Stern, Richard Martin",
    "genre": "Krimi, thrillery a špionážne romány",
    "originalTitle": "Missing Persons"
  },
  {
    "title": "NOMAD",
    "author": "Swallow, James",
    "genre": "Krimi, thrillery a špionážne romány",
    "originalTitle": "Nomad"
  },
  {
    "title": "KÚKOL",
    "author": "Thürk, Harry",
    "genre": "Krimi, thrillery a špionážne romány",
    "originalTitle": "The Tares"
  },
  {
    "title": "Strašidelný kláštor / Motív vŕbovej halúzky / Opica a tiger",
    "author": "van Gulik, Robert",
    "genre": "Krimi, thrillery a špionážne romány",
    "originalTitle": "The Haunted Monastery / The Willow Pattern / The Monkey and the Tiger"
  },
  {
    "title": "Nez dojde k vrazde",
    "author": "Vostrá, Alena",
    "genre": "Krimi, thrillery a špionážne romány"
  },
  {
    "title": "Cibuľové pole",
    "author": "Wambaugh, Joseph",
    "genre": "Krimi, thrillery a špionážne romány",
    "originalTitle": "The Onion Field"
  },
  {
    "title": "Kamaráti",
    "author": "Baklanov, Grigorij",
    "genre": "Vojnové romány",
    "originalTitle": "Friends"
  },
  {
    "title": "Keď mlčia zbrane, zákony mlčia",
    "author": "Izakovič, Ivan",
    "genre": "Vojnové romány"
  },
  {
    "title": "Dvadsaťtisíc zlodejov",
    "author": "Lambert, Eric",
    "genre": "Vojnové romány",
    "originalTitle": "Twenty Thousand Thieves"
  },
  {
    "title": "Veteráni",
    "author": "Lambert, Eric",
    "genre": "Vojnové romány",
    "originalTitle": "The Veterans"
  },
  {
    "title": "Víchor nad Neretvou",
    "author": "Maclean, Alistair",
    "genre": "Vojnové romány",
    "originalTitle": "Force 10 from Navarone"
  },
  {
    "title": "Koža",
    "author": "Malaparte, Curzio",
    "genre": "Vojnové romány",
    "originalTitle": "Kaputt"
  },
  {
    "title": "VÍŤAZNÉ SALVY",
    "author": "Novek, František",
    "genre": "Vojnové romány"
  },
  {
    "title": "Můj generál",
    "author": "Opitz, Karlludwig",
    "genre": "Vojnové romány",
    "originalTitle": "My General"
  },
  {
    "title": "ČAS MILOVAŤ",
    "author": "Remarque, Erich Maria",
    "genre": "Vojnové romány",
    "originalTitle": "A Time to Love and a Time to Die"
  },
  {
    "title": "Čierny obelisk",
    "author": "Remarque, Erich Maria",
    "genre": "Vojnové romány",
    "originalTitle": "The Black Obelisk"
  },
  {
    "title": "ERICH MARIA REMARQUE TRAJA KAMARÁTI",
    "author": "Remarque, Erich Maria",
    "genre": "Vojnové romány",
    "originalTitle": "Three Comrades"
  },
  {
    "title": "NA ZÁPADE NIČ NOVÉ",
    "author": "Remarque, Erich Maria",
    "genre": "Vojnové romány",
    "originalTitle": "All Quiet on the Western Front"
  },
  {
    "title": "KRÍŽOVÁ CESTA",
    "author": "Tolstoj, Alexej",
    "genre": "Vojnové romány",
    "originalTitle": "The Road to Calvary"
  },
  {
    "title": "DONA FLORA A JEJ DVAJA MUŽOV",
    "author": "Amado, Jorge",
    "genre": "Humor a satira",
    "originalTitle": "Dona Flor and Her Two Husbands"
  },
  {
    "title": "Podnikový výlet",
    "author": "Hašek, Jaroslav",
    "genre": "Humor a satira"
  },
  {
    "title": "DENNÍK MODERNÉHO FÁTRA",
    "author": "Landsman, Dominik",
    "genre": "Humor a satira"
  },
  {
    "title": "AKO SOM VOZIL NÓROV (1, 2)",
    "author": "Sokol, Ondrej",
    "genre": "Humor a satira"
  },
  {
    "title": "PANTALEÓN A JEHO ŽENSKÝ REGIMENT",
    "author": "Vargas Llosa, Mario",
    "genre": "Humor a satira",
    "originalTitle": "Captain Pantoja and the Special Service"
  },
  {
    "title": "GALAPÁGY",
    "author": "Vonnegut, Kurt",
    "genre": "Sci-fi a fantasy",
    "originalTitle": "Galápagos"
  },
  {
    "title": "Povesti spod Sitna",
    "author": "Horák, F.",
    "genre": "Povesti a legendy"
  },
  {
    "title": "(Neznámy titul)",
    "author": "Körner (predpoklad)",
    "genre": "Nezaradená beletria"
  },
  {
    "title": "VEĽKÝ PRÍPAD",
    "author": "Laborde",
    "genre": "Nezaradená beletria"
  },
  {
    "title": "(Neznámy titul)",
    "author": "Vries, Theun de",
    "genre": "Nezaradená beletria"
  },
  {
    "title": "SLNOVRATY",
    "author": "Rúfus, Milan",
    "genre": "Poézia"
  },
  {
    "title": "Dielo",
    "author": "Villon, François",
    "genre": "Poézia",
    "originalTitle": "The Works of François Villon"
  },
  {
    "title": "Plán Barbarossa",
    "author": "Bezymenskij, Leonid",
    "genre": "Životopisy a Dejiny",
    "originalTitle": "Operation Barbarossa"
  },
  {
    "title": "Môj život",
    "author": "Chaplin, Charlie",
    "genre": "Životopisy a Dejiny",
    "originalTitle": "My Autobiography"
  },
  {
    "title": "Tesla, vynálezca a vizionár",
    "author": "Cheney, Margaret",
    "genre": "Životopisy a Dejiny",
    "originalTitle": "Tesla: Man Out of Time"
  },
  {
    "title": "SALVADOR DALÍ - MÉ VÁŠNĚ",
    "author": "Dalí, Salvador",
    "genre": "Životopisy a Dejiny",
    "originalTitle": "The Unspeakable Confessions of Salvador Dalí"
  },
  {
    "title": "Steve Jobs",
    "author": "Isaacson, Walter",
    "genre": "Životopisy a Dejiny",
    "originalTitle": "Steve Jobs"
  },
  {
    "title": "Stalingrad",
    "author": "Knopp, Guido",
    "genre": "Životopisy a Dejiny",
    "originalTitle": "Stalingrad"
  },
  {
    "title": "Dejiny literatúry slovenskej",
    "author": "Krčméry, Štefan",
    "genre": "Životopisy a Dejiny"
  },
  {
    "title": "Dickens",
    "author": "Majchrowski, Stefan",
    "genre": "Životopisy a Dejiny",
    "originalTitle": "Dickens"
  },
  {
    "title": "RODOVÉ ERBY I",
    "author": "Novák, Jozef",
    "genre": "Životopisy a Dejiny"
  },
  {
    "title": "PREMENA",
    "author": "Ullmannová, Liv",
    "genre": "Životopisy a Dejiny",
    "originalTitle": "Changeling"
  },
  {
    "title": "Elon Musk",
    "author": "Vance, Ashlee",
    "genre": "Životopisy a Dejiny",
    "originalTitle": "Elon Musk"
  },
  {
    "title": "DEJINY UMENIA (1, 2, 3, 4)",
    "author": "Alpatov, Michail V.",
    "genre": "Umenie, Dizajn a Architektúra",
    "originalTitle": "History of Art"
  },
  {
    "title": "Prostory a dialogy Evy Jiřičné",
    "author": "Jiřičná, Eva / Hvížďala, Karel",
    "genre": "Umenie, Dizajn a Architektúra"
  },
  {
    "title": "Architecture Now! 5",
    "author": "Jodidio, Philip",
    "genre": "Umenie, Dizajn a Architektúra",
    "originalTitle": "Architecture Now! 5"
  },
  {
    "title": "Design",
    "author": "Novac, Siniša",
    "genre": "Umenie, Dizajn a Architektúra",
    "originalTitle": "Design"
  },
  {
    "title": "Dejiny umenia (1-10)",
    "author": "Pijoan, José",
    "genre": "Umenie, Dizajn a Architektúra",
    "originalTitle": "History of Art"
  },
  {
    "title": "LITERATURA (2, 3)",
    "author": "Sartre, Jean-Paul / Rossom, Walter van",
    "genre": "Umenie, Dizajn a Architektúra"
  },
  {
    "title": "POKLAD Z AGRY",
    "author": "Doyle, Arthur Conan",
    "genre": "Veda, Príroda a Cestopisy",
    "originalTitle": "The Sign of Four"
  },
  {
    "title": "ZA NOVÝMI SVETMI",
    "author": "Halliburton, Richard",
    "genre": "Veda, Príroda a Cestopisy",
    "originalTitle": "New Worlds to Conquer"
  },
  {
    "title": "Vesmír v orechovej škrupinke",
    "author": "Hawking, Stephen",
    "genre": "Veda, Príroda a Cestopisy",
    "originalTitle": "The Universe in a Nutshell"
  },
  {
    "title": "ATLAS LIEČIVÝCH RASTLÍN",
    "author": "Kresánek, Jaroslav (predpoklad)",
    "genre": "Veda, Príroda a Cestopisy",
    "originalTitle": "Atlas of Medicinal Plants"
  },
  {
    "title": "Atlas chránených rastlín",
    "author": "Magic, D. / Bosáčková, E. / Úsak, O.",
    "genre": "Veda, Príroda a Cestopisy",
    "originalTitle": "Atlas of Protected Plants"
  },
  {
    "title": "Ajurvéda",
    "author": "Verma, Dr. Vinod",
    "genre": "Veda, Príroda a Cestopisy",
    "originalTitle": "Ayurveda"
  },
  {
    "title": "Československé pralesy",
    "author": "Vyskot, Miroslav a kolektív",
    "genre": "Veda, Príroda a Cestopisy"
  },
  {
    "title": "Operácia Cicero",
    "author": "Moyzisch, L. C.",
    "genre": "Spoločnosť, Psychológia a Ostatné",
    "originalTitle": "Operation Cicero"
  },
  {
    "title": "naše dieťa",
    "author": "Slimová, M. / Fugnerová",
    "genre": "Spoločnosť, Psychológia a Ostatné"
  },
  {
    "title": "DENNÍK PSYCHOLÓGA",
    "author": "Štefanovič, Jozef",
    "genre": "Spoločnosť, Psychológia a Ostatné"
  },
  {
    "title": "Internet v boji proti zločinu",
    "author": "Walther, Hanns",
    "genre": "Spoločnosť, Psychológia a Ostatné"
  },
  {
    "title": "Anglicko-slovenský a slovensko-anglický SLOVNÍK",
    "author": "(Slovník)",
    "genre": "Slovníky a Učebnice"
  },
  {
    "title": "Rusko-slovenský slovník",
    "author": "(Slovník)",
    "genre": "Slovníky a Učebnice"
  },
  {
    "title": "angliččina (2, 3, ...)",
    "author": "(Učebnica)",
    "genre": "Slovníky a Učebnice"
  },
  {
    "title": "KONVERZAČNÁ PRÍRUČKA ANGLIČINY",
    "author": "(Učebnica)",
    "genre": "Slovníky a Učebnice"
  },
  {
    "title": "Naučte sa taliansky",
    "author": "(Učebnica)",
    "genre": "Slovníky a Učebnice"
  },
  {
    "title": "Nemčina pre pracujúcich",
    "author": "(Učebnica)",
    "genre": "Slovníky a Učebnice"
  },
  {
    "title": "Malý slovník cudzích slov",
    "author": "Ivanová-Šalingová, Mária / Maníková, Zuzana",
    "genre": "Slovníky a Učebnice"
  },
  {
    "title": "Športové dobrodružstvá",
    "author": "(Antológia)",
    "genre": "Publikácie, Sprievodcovia a Kolektívne diela"
  },
  {
    "title": "Drawing Cartoons",
    "author": "(Collins)",
    "genre": "Publikácie, Sprievodcovia a Kolektívne diela",
    "originalTitle": "Drawing Cartoons"
  },
  {
    "title": "Zelená nízkoenergetickému bývaniu",
    "author": "(Eko bývanie)",
    "genre": "Publikácie, Sprievodcovia a Kolektívne diela"
  },
  {
    "title": "Bildende Kunst im Bezirk Cottbus",
    "author": "(Kolektív autorov)",
    "genre": "Publikácie, Sprievodcovia a Kolektívne diela",
    "originalTitle": "Bildende Kunst im Bezirk Cottbus"
  },
  {
    "title": "DEJINY SLOVENSKÉHO NÁRODNÉHO POVSTANIA (1-5)",
    "author": "(Kolektív autorov)",
    "genre": "Publikácie, Sprievodcovia a Kolektívne diela",
    "originalTitle": "History of the Slovak National Uprising"
  },
  {
    "title": "Diseño de Interiores / Interior Wood Design",
    "author": "(Kolektív autorov)",
    "genre": "Publikácie, Sprievodcovia a Kolektívne diela",
    "originalTitle": "Interior Wood Design"
  },
  {
    "title": "HRADY A ZÁMKY V ČECHÁCH",
    "author": "(Kolektív autorov)",
    "genre": "Publikácie, Sprievodcovia a Kolektívne diela",
    "originalTitle": "Castles and Chateaux of Bohemia"
  },
  {
    "title": "Malá encyklopedie zeměpisu světa",
    "author": "(Kolektív autorov)",
    "genre": "Publikácie, Sprievodcovia a Kolektívne diela"
  },
  {
    "title": "Mesto v čase (minulom)",
    "author": "(Kolektív autorov / Miestna publikácia)",
    "genre": "Publikácie, Sprievodcovia a Kolektívne diela"
  },
  {
    "title": "SVIT 50 ROKOV",
    "author": "(Kompilácia)",
    "genre": "Publikácie, Sprievodcovia a Kolektívne diela"
  },
  {
    "title": "OTTOVA ENCYKLOPEDIE ZEMĚPIS SVĚTA",
    "author": "(Ottova encyklopedie)",
    "genre": "Publikácie, Sprievodcovia a Kolektívne diela"
  },
  {
    "title": "CRACOW",
    "author": "(Sprievca)",
    "genre": "Publikácie, Sprievodcovia a Kolektívne diela",
    "originalTitle": "Cracow"
  },
  {
    "title": "VENICE",
    "author": "(Sprievodca)",
    "genre": "Publikácie, Sprievodcovia a Kolektívne diela",
    "originalTitle": "Venice"
  },
  {
    "title": "VYSOKÉ TATRY",
    "author": "(Sprievodca/obrazová publikácia)",
    "genre": "Publikácie, Sprievodcovia a Kolektívne diela"
  },
  {
    "title": "SLOVENSKO (Dejiny, Príroda, Ľud, Kultúra)",
    "author": "Kolektív autorov",
    "genre": "Publikácie, Sprievodcovia a Kolektívne diela"
  },
  {
    "title": "SPIŠSKÁ SOBOTA (I. diel, II. diel)",
    "author": "Lipták, Michal / Macej, Ján",
    "genre": "Publikácie, Sprievodcovia a Kolektívne diela"
  },
  {
    "title": "SPIŠSKÁ SOBOTA",
    "author": "Olejník, Ján",
    "genre": "Publikácie, Sprievodcovia a Kolektívne diela"
  },
  {
    "title": "Oldtimer-Lexikon",
    "author": "Schrader",
    "genre": "Publikácie, Sprievodcovia a Kolektívne diela",
    "originalTitle": "Oldtimer-Lexikon"
  },
  {
    "title": "Prechádzky starým Popradom II.",
    "author": "Viac autorov (kolektív)",
    "genre": "Publikácie, Sprievodcovia a Kolektívne diela"
  },
  {
    "title": "DVORÁK ODKRYTÉ DEJINY",
    "author": "",
    "genre": "Neznámy / Nečitateľný autor"
  },
  {
    "title": "Haydnova hlava",
    "author": "",
    "genre": "Neznámy / Nečitateľný autor"
  },
  {
    "title": "HRÁČI - (Autor nečitateľný)",
    "author": "",
    "genre": "Neznámy / Nečitateľný autor"
  },
  {
    "title": "Ich vlastná noc",
    "author": "",
    "genre": "Neznámy / Nečitateľný autor"
  },
  {
    "title": "Nežiaduci",
    "author": "",
    "genre": "Neznámy / Nečitateľný autor"
  },
  {
    "title": "Odyseus, bronz a krv",
    "author": "",
    "genre": "Neznámy / Nečitateľný autor"
  },
  {
    "title": "Purpurová múmia",
    "author": "",
    "genre": "Neznámy / Nečitateľný autor"
  },
  {
    "title": "Rakovina",
    "author": "",
    "genre": "Neznámy / Nečitateľný autor"
  },
  {
    "title": "REGINA EZEROVÁ - PLÁNKA",
    "author": "",
    "genre": "Neznámy / Nečitateľný autor"
  },
  {
    "title": "SKRYTOU KAMEROU",
    "author": "",
    "genre": "Neznámy / Nečitateľný autor"
  },
  {
    "title": "Šialenstvo",
    "author": "",
    "genre": "Neznámy / Nečitateľný autor"
  },
  {
    "title": "TRI OPICE - (Autor nečitateľný)",
    "author": "",
    "genre": "Neznámy / Nečitateľný autor"
  }
];
