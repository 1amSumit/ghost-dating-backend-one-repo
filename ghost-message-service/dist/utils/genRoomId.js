"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUSerID = generateUSerID;
function generateUSerID(user1, user2) {
    return [user1, user2].sort().join("-");
}
