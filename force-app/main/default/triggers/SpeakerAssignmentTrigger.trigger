trigger SpeakerAssignmentTrigger on Speaker_Assignment__c (
    before insert, before update) {
    if (Trigger.isBefore) {
        SpeakerAssignmentHandler.checkForConflicts(
            Trigger.new,
            Trigger.isUpdate ? Trigger.oldMap : null
        );
    }
}