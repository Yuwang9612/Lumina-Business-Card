/**
 * @file engine/structureEngine.gs
 * Structure health layer: compute estValue, net, stage for each card.
 */

function runStructureEngine(cardsNormalized) {
  var results = [];
  for (var i = 0; i < cardsNormalized.length; i++) {
    var card = cardsNormalized[i];
    var recurring_value = card.annualSpendValue * card.baseReturn;
    var net_recurring = recurring_value - card.annualFee;
    var stage = 'Efficient';
    if (net_recurring < 0) {
      stage = 'Bleeding';
    } else if (net_recurring < DECISION_CONFIG.BLEEDING_MIN_LOSS) {
      stage = 'Watch';
    }
    results.push({
      cardName: card.cardName,
      annualFee: card.annualFee,
      recurring_value: recurring_value,
      net_recurring: net_recurring,
      estValue: recurring_value,
      net: net_recurring,
      stage: stage,
      annualSpendValue: card.annualSpendValue,
      baseReturn: card.baseReturn,
      downgradeOption: card.downgradeOption
    });
  }
  return results;
}

function computePortfolioSummary(structureResults) {
  var totalFees = 0;
  var totalValue = 0;
  var bleedingCards = [];
  for (var i = 0; i < structureResults.length; i++) {
    var r = structureResults[i];
    totalFees += r.annualFee;
    totalValue += r.estValue;
    if (r.stage === 'Bleeding') {
      bleedingCards.push(r);
    }
  }
  var currentNet = totalValue - totalFees;
  var optimizedNet = currentNet;
  var delta = 0;
  if (bleedingCards.length > 0) {
    bleedingCards.sort(function(a, b) { return (b.annualFee - b.estValue) - (a.annualFee - a.estValue); });
    var topBleeding = bleedingCards[0];
    var savedFee = topBleeding.downgradeOption ? Math.round(topBleeding.annualFee * 0.8) : topBleeding.annualFee;
    optimizedNet = currentNet + savedFee;
    delta = optimizedNet - currentNet;
  }
  return {
    currentFees: totalFees,
    currentValue: totalValue,
    currentNet: currentNet,
    optimizedNet: optimizedNet,
    delta: delta,
    bleedingCount: bleedingCards.length
  };
}
