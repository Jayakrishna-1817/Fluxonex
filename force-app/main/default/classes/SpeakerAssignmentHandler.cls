public class SpeakerAssignmentHandler {

    public static void checkForConflicts(
        List<Speaker_Assignment__c> newAssignments,
        Map<Id, Speaker_Assignment__c> oldMap
    ) {

        Set<Id> speakerIds = new Set<Id>();
        Set<Id> sessionIds = new Set<Id>();

        for (Speaker_Assignment__c sa : newAssignments) {
            if (sa.Speaker__c != null && sa.Session__c != null) {
                speakerIds.add(sa.Speaker__c);
                sessionIds.add(sa.Session__c);
            }
        }

        if (speakerIds.isEmpty()) return;

        Map<Id, Session__c> newSessionMap = new Map<Id, Session__c>(
            [SELECT Id, Session_Date__c, Start_Time__c, End_Time__c
             FROM Session__c
             WHERE Id IN :sessionIds]
        );

        List<Speaker_Assignment__c> existingAssignments = [
            SELECT Id, Speaker__c, Session__c,
                   Session__r.Session_Date__c,
                   Session__r.Start_Time__c,
                   Session__r.End_Time__c
            FROM Speaker_Assignment__c
            WHERE Speaker__c IN :speakerIds
        ];

        Map<Id, List<Session__c>> speakerSessionMap = new Map<Id, List<Session__c>>();

        for (Speaker_Assignment__c sa : existingAssignments) {
            if (!speakerSessionMap.containsKey(sa.Speaker__c)) {
                speakerSessionMap.put(sa.Speaker__c, new List<Session__c>());
            }
            speakerSessionMap.get(sa.Speaker__c).add(sa.Session__r);
        }

        for (Speaker_Assignment__c newSA : newAssignments) {

            if (oldMap != null && oldMap.containsKey(newSA.Id)) {
                if (oldMap.get(newSA.Id).Session__c == newSA.Session__c) {
                    continue;
                }
            }

            Session__c newSession = newSessionMap.get(newSA.Session__c);
            if (newSession == null) continue;

            List<Session__c> bookedSessions =
                speakerSessionMap.get(newSA.Speaker__c);

            if (bookedSessions == null) continue;

            for (Session__c booked : bookedSessions) {

                if (booked.Session_Date__c == newSession.Session_Date__c) {

                    Boolean isOverlap =
                        newSession.Start_Time__c < booked.End_Time__c &&
                        newSession.End_Time__c > booked.Start_Time__c;

                    if (isOverlap) {
                        newSA.addError(
                            'Speaker is already booked for this time.'
                        );
                        break;
                    }
                }
            }
        }
    }
}