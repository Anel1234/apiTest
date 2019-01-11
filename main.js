$(document).ready(function () {
    console.log('App starting!');
    ko.applyBindings(new userDetailsViewModel());
})

function userDetailsViewModel() {
    var self = this;
    self.firstName = ko.observable("");
    self.lastName = ko.observable("");
    self.dateOfBirth = ko.observable("");
    self.decision = ko.observable("");

    var $loading = $('#loadingDiv').hide();

    $(document)
    .ajaxStart(function () {
        $('#submitButton').attr("disabled", true);
        $loading.show();
    })
    .ajaxStop(function () {
        $('#submitButton').attr("disabled", false);
        $loading.hide();
    });

    submitDetails = function() {

        // var userDetails = {
        //     "body": {
        //         firstName: self.firstName,
        //         lastName: self.lastName,
        //         dateOfBirth: self.dateOfBirth
        //     }
        // }

        var userDetails = {
            "body": {
                firstName: self.firstName(),
                lastName: self.lastName(),
                dateOfBirth: self.dateOfBirth()
            }
        }

        $.ajax({
            url: 'https://ooqmth8aw9.execute-api.eu-west-2.amazonaws.com/test/',
            type: 'post',
            dataType: 'text',
            crossDomain: true,
            //contentType: 'application/json',
            success: function (data) {
                alert(data);
                self.decision(data);
            },
            failure: function () {
                self.decision("An error has occured");
            },
            data: JSON.stringify(userDetails)
        })
        
    }
}



