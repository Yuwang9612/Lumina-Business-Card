/**
 * @file engine/orchestrator.gs
 * Priority orchestrator: combine structure, lifecycle, market results into decision plan.
 */

function runOrchestrator(structureResults, lifecycleResults, marketSignals, portfolioSummary) {
  var items = [];
  var structureMap = {};
  var lifecycleMap = {};
  for (var i = 0; i < structureResults.length; i++) {
    structureMap[structureResults[i].cardName] = structureResults[i];
  }
  for (var i = 0; i < lifecycleResults.length; i++) {
    lifecycleMap[lifecycleResults[i].cardName] = lifecycleResults[i];
  }
  for (var i = 0; i < structureResults.length; i++) {
    var struct = structureResults[i];
    var lifecycle = lifecycleMap[struct.cardName];
    if (lifecycle && lifecycle.lifecycle === 'PreBonus') {
      items.push({
        type: 'BONUS_NOT_COLLECTED',
        cardName: struct.cardName,
        priority: 1,
        structure: struct,
        lifecycle: lifecycle
      });
    } else if (struct.stage === 'Bleeding') {
      items.push({
        type: 'BLEEDING',
        cardName: struct.cardName,
        priority: 2,
        structure: struct,
        lifecycle: lifecycle
      });
    } else if (struct.stage === 'Watch') {
      items.push({
        type: 'WATCH',
        cardName: struct.cardName,
        priority: 4,
        structure: struct,
        lifecycle: lifecycle
      });
    } else {
      items.push({
        type: 'EFFICIENT',
        cardName: struct.cardName,
        priority: 5,
        structure: struct,
        lifecycle: lifecycle
      });
    }
  }
  for (var i = 0; i < marketSignals.length; i++) {
    items.push({
      type: 'MARKET_WINDOW',
      cardName: marketSignals[i].cardName,
      priority: 3,
      marketSignal: marketSignals[i]
    });
  }
  items.sort(function(a, b) {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.type === 'BONUS_NOT_COLLECTED' && b.type === 'BONUS_NOT_COLLECTED') {
      var monthsA = a.lifecycle && a.lifecycle.monthsSinceOpened != null ? a.lifecycle.monthsSinceOpened : 999;
      var monthsB = b.lifecycle && b.lifecycle.monthsSinceOpened != null ? b.lifecycle.monthsSinceOpened : 999;
      return monthsA - monthsB;
    }
    if (a.type === 'BLEEDING' && b.type === 'BLEEDING') {
      var lossA = a.structure.annualFee - a.structure.estValue;
      var lossB = b.structure.annualFee - b.structure.estValue;
      return lossB - lossA;
    }
    return 0;
  });
  var shouldSuppressStrongRecommend = portfolioSummary.delta < DECISION_CONFIG.REALIZABLE_DELTA_MIN;
  var hasBleedingOver100 = false;
  for (var i = 0; i < items.length; i++) {
    if (items[i].type === 'BLEEDING') {
      var loss = items[i].structure.annualFee - items[i].structure.estValue;
      if (loss >= DECISION_CONFIG.BLEEDING_MIN_LOSS) {
        hasBleedingOver100 = true;
        break;
      }
    }
  }
  return {
    items: items,
    portfolioSummary: portfolioSummary,
    suppressStrongRecommend: shouldSuppressStrongRecommend && !hasBleedingOver100
  };
}
