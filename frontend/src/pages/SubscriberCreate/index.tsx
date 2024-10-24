import React, { useState } from "react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import axios from "../../axios";

import Dashboard from "../../Dashboard";
import { Button, Grid } from "@mui/material";
import { SubscriberFormProvider, useSubscriptionForm } from "../../hooks/subscription-form";
import SubscriberFormBasic from "./SubscriberFormBasic";
import SubscriberFormUeAmbr from "./SubscriberFormUeAmbr";
import SubscriberFormSessions from "./SubscriberFormSessions";
import { FlowsMapperImpl, SubscriptionMapperImpl } from "../../lib/dtos/subscription";

function FormHOC(Component: React.ComponentType<any>) {
  return function (props: any) {
    return (
      <SubscriberFormProvider>
        <Component {...props} />
      </SubscriberFormProvider>
    );
  };
}

export default FormHOC(SubscriberCreate);

function SubscriberCreate() {
  const { id, plmn } = useParams<{
    id: string;
    plmn: string;
  }>();

  const isNewSubscriber = id === undefined && plmn === undefined;
  const navigation = useNavigate();
  const [loading, setLoading] = useState(false);

  const { handleSubmit, getValues, reset } = useSubscriptionForm();

  if (!isNewSubscriber) {
    useEffect(() => {
      setLoading(true);

      axios
        .get("/api/subscriber/" + id + "/" + plmn)
        .then((res) => {
          const subscriberMapper = new SubscriptionMapperImpl(new FlowsMapperImpl());
          const subscription = subscriberMapper.mapFromSubscription(res.data);
          reset(subscription);
        })
        .finally(() => {
          setLoading(false);
        });
    }, [id]);
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  const supiIncrement = (supi: string): string => {
    const imsi = supi.split("-", 2);
    if (imsi.length !== 2) {
      return supi;
    }
    let number = Number(imsi[1]);
    number += 1;
    return "imsi-" + number;
  };

  const onCreate = () => {
    console.log("trace: onCreate");

    const data = getValues();

    if (data.SnssaiConfigurations.length === 0) {
      alert("Please add at least one S-NSSAI");
      return;
    }

    const subscriberMapper = new SubscriptionMapperImpl(new FlowsMapperImpl());
    const subscription = subscriberMapper.mapFromDto(data);

    // Iterate subscriber data number.
    let supi = subscription.ueId;
    for (let i = 0; i < subscription.userNumber!; i++) {
      subscription.ueId = supi;
      axios
        .post("/api/subscriber/" + subscription.ueId + "/" + subscription.plmnID, subscription)
        .then(() => {
          navigation("/subscriber");
        })
        .catch((err) => {
          if (err.response) {
            const msg = "Status: " + err.response.status;
            if (err.response.data.cause) {
              alert(msg + ", cause: " + err.response.data.cause);
            } else if (err.response.data) {
              alert(msg + ", data:" + err.response.data);
            } else {
              alert(msg);
            }
          } else {
            alert(err.message);
          }
          console.log(err);
          return;
        });
      supi = supiIncrement(supi);
    }
  };

  const onUpdate = () => {
    console.log("trace: onUpdate");

    const data = getValues();
    const subscriberMapper = new SubscriptionMapperImpl(new FlowsMapperImpl());
    const subscription = subscriberMapper.mapFromDto(data);

    axios
      .put("/api/subscriber/" + subscription.ueId + "/" + subscription.plmnID, subscription)
      .then(() => {
        navigation("/subscriber/" + subscription.ueId + "/" + subscription.plmnID);
      })
      .catch((err) => {
        if (err.response) {
          const msg = "Status: " + err.response.status;
          if (err.response.data.cause) {
            alert(msg + ", cause: " + err.response.data.cause);
          } else if (err.response.data) {
            alert(msg + ", data:" + err.response.data);
          } else {
            alert(msg);
          }
        } else {
          alert(err.message);
        }
      });
  };

  const formSubmitFn = isNewSubscriber ? onCreate : onUpdate;
  const formSubmitText = isNewSubscriber ? "CREATE" : "UPDATE";

  return (
    <Dashboard title="Subscription" refreshAction={() => {}}>
      <form
        onSubmit={handleSubmit(formSubmitFn, (err) => {
          console.log("form error: ", err);
        })}
      >
        <SubscriberFormBasic />

        <h3>Subscribed UE AMBR</h3>
        <SubscriberFormUeAmbr />

        <SubscriberFormSessions />

        <br />
        <Grid item xs={12}>
          <Button color="primary" variant="contained" type="submit" sx={{ m: 1 }}>
            {formSubmitText}
          </Button>
        </Grid>
      </form>
    </Dashboard>
  );
}