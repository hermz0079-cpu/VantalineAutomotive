const phone="447435376862";
const $=id=>document.getElementById(id);
const service=$("service"),miles=$("miles"),vehicle=$("vehicle"),condition=$("condition"),estimate=$("estimate");
const serviceConfig={
 recovery:{miles:true,vehicle:true,condition:true,destination:true,reg:true,base:79,label:"Recovery / towing",button:"Get Fixed Recovery Quote on WhatsApp"},
 jump:{vehicle:true,reg:true,base:60,label:"Jump start",button:"Get Jump Start Quote on WhatsApp"},
 accident:{miles:true,vehicle:true,condition:true,destination:true,reg:true,base:150,label:"Accident / winch recovery",button:"Get Accident Recovery Quote on WhatsApp"},
 pullout:{vehicle:true,pullout:true,mobility:true,reg:true,base:120,label:"Vehicle pull-out / winch-out",button:"Get Pull-Out Quote on WhatsApp"},
 tyre:{vehicle:true,tyre:true,reg:true,base:90,label:"Tyre assistance",button:"Get Tyre Assistance Quote on WhatsApp"},
 fuel:{fuel:true,reg:true,base:95,label:"Fuel delivery",button:"Get Fuel Delivery Quote on WhatsApp"},
 transport:{miles:true,vehicle:true,condition:true,destination:true,reg:true,base:69,label:"Scheduled vehicle transport",button:"Get Transport Quote on WhatsApp"},
 motorcycle:{miles:true,bike:true,bikeCondition:true,destination:true,reg:true,base:75,label:"Motorcycle recovery",button:"Get Motorcycle Recovery Quote on WhatsApp"}
};
function show(id,on){const el=$(id);if(el)el.hidden=!on}
function updateFields(){
 const c=serviceConfig[service.value];
 show("milesField",!!c.miles); show("vehicleField",!!c.vehicle); show("bikeField",!!c.bike);
 show("conditionField",!!c.condition); show("bikeConditionField",!!c.bikeCondition); show("fuelTypeField",!!c.fuel); show("tyreIssueField",!!c.tyre);
 show("pulloutTypeField",!!c.pullout); show("pulloutMobilityField",!!c.mobility);
 show("destinationField",!!c.destination); show("regField",!!c.reg);
 $("pickupLabel").textContent=c.fuel?"Delivery location / postcode":(service.value==="pullout"?"Vehicle location / postcode":((service.value==="jump"||service.value==="tyre")?"Your location / postcode":"Pickup postcode / location"));
 $("pickup").placeholder=c.fuel?"Where should we deliver the fuel?":(service.value==="pullout"?"Where is the vehicle stuck?":"e.g. HA9 or M25 J16");
 $("send").textContent=c.button;
 const rowNeedsTwo=c.miles&&c.vehicle;
 $("journeyRow").style.gridTemplateColumns=rowNeedsTwo?"1fr 1fr":"1fr";
 calc();
}
function calc(){
 const c=serviceConfig[service.value],mi=Math.max(0,Number(miles.value||0));
 let total=c.base;
 if(c.miles){total+=Math.max(0,mi-5)*(service.value==="transport"?1.55:1.85)}
 if(c.vehicle){total+=vehicle.value==="suv"?20:vehicle.value==="van"?35:vehicle.value==="prestige"?20:0}
 if(c.condition){total+=condition.value==="nonrunner"?25:condition.value==="locked"?50:condition.value==="accident"?60:0}
 if(c.bikeCondition){const bc=$("bikeCondition").value;total+=bc==="nonrunner"?25:bc==="accident"?60:0}
 if(c.pullout){const pt=$("pulloutType").value;total+=pt==="ditch"?60:(pt==="obstruction"||pt==="restricted")?30:0}
 if(c.mobility){const pm=$("pulloutMobility").value;total+=pm==="spinning"?15:pm==="locked"?40:pm==="accident"?60:0}
 total=Math.max(c.base,Math.round(total*100)/100);
 estimate.textContent=new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format(total)+(service.value==="fuel"?" + fuel":"");
 return total;
}
function selectedText(id){const el=$(id);return el?.options?.[el.selectedIndex]?.text||""}
function buildMessage(){
 const c=serviceConfig[service.value],lines=[`Hi Vantaline Recovery, I need ${c.label.toLowerCase()}.`];
 const locationLabel=c.fuel?"Delivery location":(service.value==="pullout"?"Vehicle location":((service.value==="jump"||service.value==="tyre")?"Location":"Pickup"));
 lines.push(`${locationLabel}: ${$("pickup").value||"TBC"}`);
 if(c.destination)lines.push(`Destination: ${$("destination").value||"TBC"}`);
 if(c.reg)lines.push(`Registration: ${$("reg").value||"TBC"}`);
 if(c.vehicle)lines.push(`Vehicle type: ${selectedText("vehicle")}`);
 if(c.bike)lines.push(`Motorcycle: ${$("bike").value||"TBC"}`);
 if(c.condition)lines.push(`Condition: ${selectedText("condition")}`);
 if(c.bikeCondition)lines.push(`Motorcycle condition: ${selectedText("bikeCondition")}`);
 if(c.fuel)lines.push(`Fuel required: ${selectedText("fuelType")}`);
 if(c.tyre)lines.push(`Tyre issue: ${selectedText("tyreIssue")}`);
 if(c.pullout)lines.push(`Stuck situation: ${selectedText("pulloutType")}`);
 if(c.mobility)lines.push(`Vehicle movement: ${selectedText("pulloutMobility")}`);
 if(c.miles)lines.push(`Approx. journey miles: ${miles.value||"TBC"}`);
 lines.push(`Website guide: ${estimate.textContent||"TBC"}`);
 if(service.value==="pullout")lines.push("If the vehicle cannot be freed safely, please also quote onward recovery if required.");
 lines.push("Please confirm the final price and availability.");
 return lines.join("\n");
}
function validate(){
 const c=serviceConfig[service.value],missing=[];
 if(!$("pickup").value.trim())missing.push(c.fuel?"delivery location":"location");
 if(c.destination&&!$("destination").value.trim())missing.push("destination");
 if(c.reg&&!$("reg").value.trim())missing.push("registration");
 if(c.bike&&!$("bike").value.trim())missing.push("motorcycle make/model");
 return missing;
}
function openWA(){window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildMessage())}`,"_blank")}
function buildTradeMessage(){
 return [
  "Hi Vantaline Recovery, I would like to enquire about a trade account.",
  "",
  "Business name:",
  "Business type: Garage / Dealer / Bodyshop / Fleet / Other",
  "Main area / postcode:",
  "Approx. vehicle movements per month:",
  "Typical collection / delivery areas:",
  "",
  "Please send me your trade rates and account details."
 ].join("\n");
}
function openTradeWA(){window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildTradeMessage())}`,"_blank")}
[service,miles,vehicle,condition,$("bikeCondition"),$("fuelType"),$("tyreIssue"),$("pulloutType"),$("pulloutMobility")].filter(Boolean).forEach(x=>x.addEventListener("input",()=>{if(x===service)updateFields();else calc()}));
document.querySelectorAll(".wa").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();openWA()}));
document.querySelectorAll(".trade-wa").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();openTradeWA()}));
document.querySelectorAll(".pullout-book").forEach(a=>a.addEventListener("click",()=>{service.value="pullout";updateFields()}));
$("send").addEventListener("click",()=>{const m=$("msg"),missing=validate();if(missing.length){m.style.display="block";m.textContent=`Please add ${missing.join(", ")} so we can quote this ${serviceConfig[service.value].label.toLowerCase()} properly.`;return}m.style.display="none";openWA()});
updateFields();