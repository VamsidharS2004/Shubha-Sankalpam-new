const fs = require('fs');
let content = fs.readFileSync('frontend/assets/js/pages/account.js', 'utf8');

const regex = /if \(\!matchedItem\) \{[\s\S]*?matchedItem = \{[\s\S]*?name: displayPuja\.includes\("razorpay_"\) \? "Puja \/ Package" : displayPuja,[\s\S]*?price: b\.price,[\s\S]*?image: "assets\/images\/logo\.jpg",[\s\S]*?temple: "",[\s\S]*?date: b\.createdAt \? new Date\(b\.createdAt\)\.toLocaleDateString\("en-IN"\) : "Date not available"[\s\S]*?\};[\s\S]*?\}/;

const replacement = `if (!matchedItem) {
          matchedItem = {
            name: b.snapshot?.name || (displayPuja.includes("razorpay_") ? "Puja / Package" : displayPuja),
            price: b.snapshot?.price || b.price,
            image: b.snapshot?.image || "assets/images/logo.jpg",
            temple: "",
            date: b.createdAt ? new Date(b.createdAt).toLocaleDateString("en-IN") : "Date not available"
          };
        } else if (b.snapshot) {
          matchedItem = { ...matchedItem, image: b.snapshot.image || matchedItem.image, price: b.snapshot.price || matchedItem.price };
        }`;

const replaced = content.replace(regex, replacement);
if (replaced === content) console.log('NO MATCH');
else console.log('MATCHED AND REPLACED');
fs.writeFileSync('frontend/assets/js/pages/account.js', replaced);
