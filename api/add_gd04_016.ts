import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function addGD04_016() {
  const cardData = {
    id: "gd04016",
    name: "Gundam Deathscythe Hell",
    set: "GD 04",
    cardNumber: "GD04-016",
    type: "Unit",
    color: "Black",
    rarity: "SR",
    cost: 5,
    level: 5,
    ap: 6,
    hp: 6,
    ability: "【Deploy】 Choose 1 of your opponent's Units with cost 4 or less and destroy it. \n【Main】 (1): This Unit gains [Stealth] until the end of the turn.",
    imageUrl: "https://exburst.dev/images/cards/GD04-016.png",
    traits: ["Gundam", "Deathscythe"],
    zones: ["Space", "Earth"],
    faq: []
  };

  try {
    console.log(`Saving card: ${cardData.name} (${cardData.cardNumber})`);
    await setDoc(doc(db, 'cards', cardData.id), cardData);
    console.log("Card saved successfully!");
  } catch (error) {
    console.error("Error adding card:", error);
  }
}

addGD04_016();
