public with sharing class SpeakerAssignmentService {
    public class AvailabilityResult {
        @AuraEnabled public Boolean available;
        @AuraEnabled public String message;
    }

    @AuraEnabled(cacheable=true)
    public static AvailabilityResult isDateAvailable(Id speakerId, Date assignmentDate) {
        AvailabilityResult res = new AvailabilityResult();
        if (speakerId == null || assignmentDate == null) {
            res.available = false;
            res.message = 'Invalid input';
            return res;
        }
        if (assignmentDate <= Date.today()) {
            res.available = false;
            res.message = 'Date must be in the future';
            return res;
        }

        Integer cnt = [
            SELECT COUNT()
            FROM Speaker_Assignment__c
            WHERE Speaker__c = :speakerId
            AND  Session__r.Session_Date__c = :assignmentDate
            WITH SECURITY_ENFORCED
        ];
        res.available = (cnt == 0);
        res.message = res.available ? 'Available' : 'Slot is already booked, try another date';
        return res;
    }

    @AuraEnabled
    public static Id createAssignment(Id speakerId, Date assignmentDate) {
        if (speakerId == null || assignmentDate == null) {
            throw new AuraHandledException('Invalid input');
        }
        if (assignmentDate <= Date.today()) {
            throw new AuraHandledException('Date must be in the future');
        }

        // Double-check availability to avoid race condition
        AvailabilityResult check = isDateAvailable(speakerId, assignmentDate);
        if (!check.available) {
            throw new AuraHandledException(check.message);
        }

        // Create Session first
        Session__c session = new Session__c();
        session.Session_Date__c = assignmentDate;
        session.Title__c = 'Session for ' + assignmentDate.format();
        // Set default time if required fields
        if (Schema.SObjectType.Session__c.fields.getMap().containsKey('Start_Time__c')) {
            session.put('Start_Time__c', Time.newInstance(9, 0, 0, 0));
        }
        if (Schema.SObjectType.Session__c.fields.getMap().containsKey('End_Time__c')) {
            session.put('End_Time__c', Time.newInstance(10, 0, 0, 0));
        }

        Database.SaveResult sessionResult = Database.insert(session, AccessLevel.USER_MODE);
        if (!sessionResult.isSuccess()) {
            String msg = 'Failed to create session';
            for (Database.Error e : sessionResult.getErrors()) {
                msg += ': ' + e.getMessage();
            }
            throw new AuraHandledException(msg);
        }

        // Create Speaker Assignment with Session ID
        Speaker_Assignment__c rec = new Speaker_Assignment__c();
        rec.Speaker__c = speakerId;
        rec.Session__c = sessionResult.getId();
        if (Schema.SObjectType.Speaker_Assignment__c.fields.getMap().containsKey('Status__c')) {
            rec.put('Status__c', 'Confirmed');
        }

        Database.SaveResult sr = Database.insert(rec, AccessLevel.USER_MODE);
        if (!sr.isSuccess()) {
            String msg = 'Failed to create assignment';
            for (Database.Error e : sr.getErrors()) {
                msg += ': ' + e.getMessage();
            }
            throw new AuraHandledException(msg);
        }
        return sr.getId();
    }

    @AuraEnabled(cacheable=true)
    public static List<Date> getUpcomingAssignmentDates(Id speakerId, Date startDate, Date endDate) {
        if (speakerId == null) {
            return new List<Date>();
        }
        Date startD = (startDate == null) ? Date.today() : startDate;
        Date endD = (endDate == null) ? startD.addMonths(3) : endDate;
        if (endD < startD) {
            Date tmp = startD;
            startD = endD;
            endD = tmp;
        }

        List<Date> dates = new List<Date>();
        for (Speaker_Assignment__c a : [
            SELECT  Session__r.Session_Date__c
            FROM Speaker_Assignment__c
            WHERE Speaker__c = :speakerId
            AND  Session__r.Session_Date__c >= :startD
            AND  Session__r.Session_Date__c <= :endD
            WITH SECURITY_ENFORCED
            ORDER BY Session__r.Session_Date__c ASC
            LIMIT 1000
        ]) {
            if (a.Session__r.Session_Date__c != null) {
                dates.add(a.Session__r.Session_Date__c);
            }
        }
        return dates;
    }
}